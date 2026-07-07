import type { Page, Route } from '@playwright/test';
import { MOCK_UUIDS } from '../constants';
import { buildAuthSession, seedAuthSession } from './auth';
import {
	buildCleaning,
	buildProperty,
	buildStandardTask,
	buildTask,
	buildUser,
	type MockCleaning,
	type MockData,
	type MockProperty,
	type MockStandardTask,
	type MockTask,
	type MockUser,
	now,
} from './mock-data';

function eqFilter(url: URL, param: string): string | null {
	const raw = url.searchParams.get(param);
	return raw ? raw.replace(/^eq\./, '') : null;
}

async function isSingleRequest(route: Route): Promise<boolean> {
	const headers = await route.request().allHeaders();
	return (headers.accept || '').includes('application/vnd.pgrst.object+json');
}

async function fulfillJson(route: Route, data: unknown, status = 200): Promise<void> {
	const isSingle = await isSingleRequest(route);
	const body = isSingle && Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
	await route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

function enrichCleaning(cleaning: MockCleaning, data: MockData): Record<string, unknown> {
	const property = (data.properties ?? []).find((p) => p.id === cleaning.property_id) ?? null;
	const cleanerUser = cleaning.cleaner_id
		? [data.user, ...(data.users ?? [])].find((u) => u.id === cleaning.cleaner_id)
		: null;
	return {
		...cleaning,
		property,
		cleaner: cleanerUser
			? { full_name: cleanerUser.full_name, avatar_url: cleanerUser.avatar_url }
			: null,
		evidence: [],
		cleaning_tasks: (data.tasks ?? []).filter((t) => t.cleaning_id === cleaning.id),
		cleaning_reports: [],
	};
}

function toAdminUser(u: MockUser): Record<string, unknown> {
	return {
		id: u.id,
		email: u.email,
		full_name: u.full_name,
		role: u.role,
		is_verified: u.is_verified,
		avatar_url: u.avatar_url,
		banned_until: null,
		created_at: u.created_at,
		last_sign_in_at: u.last_seen_at,
		last_seen_at: u.last_seen_at,
		is_online: u.is_online,
		last_sign_in_text: null,
		deleted_at: null,
	};
}

function fullUserStats(data: MockData): Record<string, unknown> {
	const allUsers = [data.user, ...(data.users ?? [])];
	const hosts = allUsers.filter((u) => u.role === 'host').length;
	const cleaners = allUsers.filter((u) => u.role === 'cleaner').length;
	const admins = allUsers.filter((u) => u.role === 'admin').length;
	const online = allUsers.filter((u) => u.is_online).length;
	return {
		total_users: allUsers.length,
		banned_users: 0,
		hosts_count: hosts,
		cleaners_count: cleaners,
		admins_count: admins,
		new_users_this_month: 0,
		new_users_last_month: 0,
		recently_online: online,
		online_now: online,
	};
}

function fullPlatformStats(): Record<string, unknown> {
	return {
		total_properties: 2,
		total_hosts: 1,
		total_cleaners: 2,
		completed_cleanings_mtd: 12,
		completed_cleanings_ytd: 45,
		total_cleanings_mtd: 20,
		cleanings_in_progress: 3,
		avg_completion_hours: 1.75,
		broken_items_mtd: 0,
		low_supplies_mtd: 0,
		calculated_at: now(),
	};
}

export async function setupSupabaseMocks(
	page: Page,
	data: MockData,
	_options?: { isAdmin?: boolean },
): Promise<void> {
	const {
		user,
		properties = [],
		cleanings = [],
		tasks = [],
		standardTasks = [],
		users = [],
	} = data;
	const _allUsers = [user, ...users];

	// ── Catch-all for any unhandled Supabase requests ──────

	await page.route(/(supabase\.co|127\.0\.0\.1:54321)/, async (route: Route) => {
		const method = route.request().method();
		const isSingle = await isSingleRequest(route);
		if (method === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: isSingle ? '{}' : '[]',
			});
		} else if (['POST', 'PATCH', 'PUT'].includes(method)) {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
		} else if (method === 'DELETE') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: isSingle ? '{}' : '[]',
			});
		} else if (method === 'HEAD') {
			await route.fulfill({
				status: 200,
				headers: { 'content-range': '0-0/0' },
			});
		} else {
			await route.fallback();
		}
	});

	// ── Auth catch-all ─────
	await page.route(/\/auth\/v1\//, async (route: Route) => {
		await fulfillJson(route, { currentLevel: 'aal1' });
	});

	// ── Auth endpoints ────────────────────────────────────

	await page.route(/\/auth\/v1\/token(\?.*)?$/, async (route: Route) => {
		if (route.request().method() === 'POST') {
			await fulfillJson(route, buildAuthSession(user));
		} else {
			await route.fallback();
		}
	});

	await page.route(/\/auth\/v1\/signup(\?.*)?$/, async (route: Route) => {
		await fulfillJson(route, buildAuthSession(user).user);
	});

	await page.route(/\/auth\/v1\/user(\?.*)?$/, async (route: Route) => {
		await fulfillJson(route, buildAuthSession(user).user);
	});

	await page.route(/\/auth\/v1\/logout(\?.*)?$/, async (route: Route) => {
		await route.fulfill({ status: 204 });
	});

	// ── MFA endpoints (only for admin) ────────────────────

	if (_options?.isAdmin) {
		await page.route(/\/auth\/v1\/(factors|mfa)/, async (route: Route) => {
			const url = route.request().url();
			if (url.includes('factors')) {
				await fulfillJson(route, { all: [], totp: [] });
			} else {
				await fulfillJson(route, { currentLevel: 'aal1' });
			}
		});
	}

	// ── Signup endpoint (POST) ──────────────────────────────────
	await page.route(/\/auth\/v1\/signup(\?.*)?$/, async (route: Route) => {
		if (route.request().method() !== 'POST') {
			await route.fallback();
			return;
		}
		let body: Record<string, unknown> = {};
		try {
			body = (route.request().postDataJSON() as Record<string, unknown>) ?? {};
		} catch {
			// body stays as empty object
		}
		const signupUser = {
			id: MOCK_UUIDS.HOST,
			aud: 'authenticated',
			role: 'authenticated',
			email: body.email ?? 'newuser@example.com',
			email_confirmed_at: null,
			phone: '',
			confirmed_at: null,
			last_sign_in_at: null,
			app_metadata: { provider: 'email', providers: ['email'] },
			user_metadata: {
				full_name: body.data?.full_name ?? 'New User',
				role: body.data?.role ?? 'host',
			},
			identities: [],
			created_at: now(),
			updated_at: now(),
		};
		await fulfillJson(route, { user: signupUser, session: null });
	});

	// ── Verify OTP endpoint (POST) ─────────────────────────────
	await page.route(/\/auth\/v1\/verify(\?.*)?$/, async (route: Route) => {
		if (route.request().method() !== 'POST') {
			await route.fallback();
			return;
		}
		const session = buildAuthSession(buildUser('host'));
		await fulfillJson(route, session);
	});

	// ── REST table endpoints ──────────────────────────────

	await page.route(
		/\/rest\/v1\/(profiles|properties|cleanings|cleaning_tasks|evidence_media|cleaning_reports|standard_tasks|platform_stats|notifications|notification_preferences)/,
		async (route: Route) => {
			const url = new URL(route.request().url());
			const table = url.pathname.split('/').pop() ?? '';
			const method = route.request().method();

			switch (table) {
				case 'profiles': {
					if (method === 'GET') {
						const filterId = eqFilter(url, 'id');
						let result = [..._allUsers];
						if (filterId) {
							result = result.filter((u) => u.id === filterId);
						}
						await fulfillJson(route, result);
					} else if (method === 'PATCH' || method === 'POST') {
						await fulfillJson(route, user);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'platform_stats': {
					if (method === 'GET') {
						await fulfillJson(route, fullPlatformStats());
					} else {
						await fulfillJson(route, {});
					}
					return;
				}

				case 'properties': {
					if (method === 'GET') {
						const filterId = eqFilter(url, 'id');
						const filterHostId = eqFilter(url, 'host_id');
						let result = [...properties];
						if (filterHostId) {
							result = result.filter((p) => p.host_id === filterHostId);
						}
						if (filterId) {
							result = result.filter((p) => p.id === filterId);
						}
						await fulfillJson(route, result);
					} else if (method === 'POST') {
						let body: Record<string, unknown> = {};
						try {
							body = (route.request().postDataJSON() as Record<string, unknown>) ?? {};
						} catch {
							// body stays as empty object
						}
						if (body.id) {
							const idx = properties.findIndex((p) => p.id === body.id);
							if (idx !== -1) {
								properties[idx] = { ...properties[idx], ...body } as MockProperty;
								await fulfillJson(route, properties[idx]);
							} else {
								await fulfillJson(route, []);
							}
						} else {
							const created = {
								id: MOCK_UUIDS.NEW_PROPERTY,
								host_id: user.id,
								type: 'apartment',
								address_line_1: body.address_line_1 ?? '789 New Street',
								address_line_2: body.address_line_2 ?? null,
								town_city: body.town_city ?? 'Manchester',
								postcode: body.postcode ?? 'M1 1AA',
								bedrooms: body.bedrooms ?? 2,
								bathrooms: body.bathrooms ?? 1,
								main_image_url: 'https://example.com/property.jpg',
								extra_images_urls: null,
								price_per_cleaning: null,
								created_at: now(),
								updated_at: now(),
							};
							await fulfillJson(route, created);
						}
					} else if (method === 'PATCH') {
						await fulfillJson(route, []);
					} else if (method === 'DELETE') {
						await fulfillJson(route, []);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'cleanings': {
					if (method === 'GET') {
						const filterId = eqFilter(url, 'id');
						const filterHostId = eqFilter(url, 'host_id');
						const filterCleanerId = eqFilter(url, 'cleaner_id');
						let result = cleanings.map((c) => enrichCleaning(c, data));
						if (filterHostId) {
							result = result.filter((c) => c.host_id === filterHostId);
						}
						if (filterCleanerId) {
							result = result.filter((c) => c.cleaner_id === filterCleanerId);
						}
						if (filterId) {
							result = result.filter((c) => c.id === filterId);
						}
						await fulfillJson(route, result);
					} else if (method === 'POST') {
						let body: Record<string, unknown> = {};
						try {
							body = (route.request().postDataJSON() as Record<string, unknown>) ?? {};
						} catch {
							// body stays as empty object
						}
						const created = {
							...buildCleaning({ id: 'new-cleaning-id' }),
							...body,
							created_at: now(),
							updated_at: now(),
						};
						await fulfillJson(route, created);
					} else if (method === 'PATCH') {
						await fulfillJson(route, []);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'cleaning_tasks': {
					if (method === 'GET') {
						const filterCleaningId = eqFilter(url, 'cleaning_id');
						let result = [...tasks];
						if (filterCleaningId) {
							result = result.filter((t) => t.cleaning_id === filterCleaningId);
						}
						await fulfillJson(route, result);
					} else if (method === 'PATCH') {
						await fulfillJson(route, tasks);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'evidence_media': {
					if (method === 'GET') {
						await fulfillJson(route, []);
					} else if (method === 'POST') {
						await fulfillJson(route, [{ id: MOCK_UUIDS.EVIDENCE_1, media_url: 'mock-url' }]);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'cleaning_reports': {
					if (method === 'GET') {
						await fulfillJson(route, []);
					} else if (method === 'POST') {
						await fulfillJson(route, [{ id: MOCK_UUIDS.REPORT_1 }]);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'standard_tasks': {
					if (method === 'GET') {
						await fulfillJson(route, standardTasks);
					} else if (method === 'POST') {
						let taskBody: Record<string, unknown> = {};
						try {
							taskBody = (route.request().postDataJSON() as Record<string, unknown>) ?? {};
						} catch {
							// taskBody stays as empty object
						}
						await fulfillJson(route, [
							{
								id: 'new-std-task',
								...taskBody,
							},
						]);
					} else if (method === 'PATCH') {
						await fulfillJson(route, standardTasks);
					} else {
						await route.fallback();
					}
					return;
				}

				case 'notifications':
				case 'notification_preferences': {
					if (method === 'GET' || method === 'HEAD') {
						await fulfillJson(route, []);
					} else if (method === 'PATCH' || method === 'POST') {
						await fulfillJson(route, {});
					} else {
						await route.fallback();
					}
					return;
				}

				default:
					await route.fallback();
			}
		},
	);

	// ── RPC endpoints ─────────────────────────────────────

	await page.route(/\/rest\/v1\/rpc\//, async (route: Route) => {
		if (route.request().method() !== 'POST') {
			await route.fallback();
			return;
		}

		const url = route.request().url();
		const rpcName = url.split('/').pop() ?? '';
		let body: Record<string, unknown> = {};
		try {
			body = (route.request().postDataJSON() as Record<string, unknown>) ?? {};
		} catch {
			// body stays as empty object
		}

		switch (rpcName) {
			case 'get_login_lock_status':
			case 'record_login_attempt':
				await fulfillJson(route, [{ is_locked: false }]);
				return;

			case 'get_dashboard_stats':
				await fulfillJson(route, {
					upcoming: properties.length,
					in_progress: cleanings.filter((c) => c.status === 'in_progress').length,
					requested: cleanings.filter((c) => c.status === 'requested').length,
					totalProperties: properties.length,
					assigned: cleanings.filter((c) => c.status === 'confirmed').length,
					active: cleanings.filter((c) => c.status === 'in_progress').length,
					completed: cleanings.filter((c) => c.status === 'completed').length,
					totalEarnings: 375.5,
					completed_this_month: 12,
					avg_completion_time: '1h 45m',
				});
				return;

			case 'admin_get_users': {
				const pRole = body.p_role as string | undefined;
				const filtered = pRole ? _allUsers.filter((u) => u.role === pRole) : _allUsers;
				await fulfillJson(route, filtered.map(toAdminUser));
				return;
			}
			case 'get_users_count':
			case 'admin_get_users_count':
				await fulfillJson(route, _allUsers.length);
				return;
			case 'get_user_stats':
			case 'admin_get_user_stats':
				await fulfillJson(route, [fullUserStats(data)]);
				return;

			case 'admin_get_all_cleanings': {
				const result = cleanings.map((c) => {
					const prop = properties.find((p) => p.id === c.property_id);
					const hostUser = _allUsers.find((u) => u.id === c.host_id);
					const cleanerUser = c.cleaner_id ? _allUsers.find((u) => u.id === c.cleaner_id) : null;
					return {
						id: c.id,
						host_id: c.host_id,
						property_id: c.property_id,
						cleaner_id: c.cleaner_id,
						status: c.status,
						scheduled_start: c.scheduled_start,
						service_cost: c.service_cost ?? 0,
						cleaner_pay: c.cleaner_pay,
						information: c.information,
						stocks_included: c.stocks_included,
						clock_in_time: c.clock_in_time,
						clock_out_time: c.clock_out_time,
						created_at: c.created_at,
						updated_at: c.updated_at,
						deleted_at: c.deleted_at,
						host_name: hostUser?.full_name ?? null,
						cleaner_name: cleanerUser?.full_name ?? null,
						property_address: prop?.address_line_1 ?? null,
						property_postcode: prop?.postcode ?? null,
						property_town_city: prop?.town_city ?? null,
					};
				});
				await fulfillJson(route, result);
				return;
			}
			case 'admin_get_cleanings_count':
				await fulfillJson(route, cleanings.length);
				return;
			case 'admin_get_unassigned_cleanings':
				await fulfillJson(
					route,
					cleanings
						.filter((c) => !c.cleaner_id)
						.map((c) => ({
							...c,
							property: properties.find((p) => p.id === c.property_id) ?? null,
						})),
				);
				return;

			case 'admin_get_available_cleaners':
				await fulfillJson(
					route,
					users
						.filter((u) => u.role === 'cleaner')
						.map((u) => ({
							id: u.id,
							full_name: u.full_name,
							avatar_url: u.avatar_url,
							current_assignments: 0,
							avg_completion_hours: null,
						})),
				);
				return;

			case 'admin_get_host_detail': {
				const targetUserId = (body.p_host_id as string) || user.id;
				const targetUser = _allUsers.find((u) => u.id === targetUserId) ?? user;
				const hostCleanings = cleanings.filter((c) => c.host_id === targetUserId);
				await fulfillJson(route, [
					{
						...toAdminUser(targetUser),
						properties: properties.filter((p) => p.host_id === targetUserId),
						cleanings: hostCleanings.map((c) => ({
							id: c.id,
							status: c.status,
							scheduled_start: c.scheduled_start,
							service_cost: c.service_cost,
							cleaner_pay: c.cleaner_pay,
							cleaner_id: c.cleaner_id,
							cleaner_name: c.cleaner_id
								? (_allUsers.find((u) => u.id === c.cleaner_id)?.full_name ?? null)
								: null,
							property_id: c.property_id,
							created_at: c.created_at,
						})),
						cleaning_stats: {
							total: hostCleanings.length,
							requested: hostCleanings.filter((c) => c.status === 'requested').length,
							confirmed: hostCleanings.filter((c) => c.status === 'confirmed').length,
							in_progress: hostCleanings.filter((c) => c.status === 'in_progress').length,
						},
					},
				]);
				return;
			}
			case 'admin_get_cleaner_detail': {
				const targetUserId = (body.p_cleaner_id as string) || user.id;
				const targetUser = _allUsers.find((u) => u.id === targetUserId) ?? user;
				const assignedCleanings = cleanings.filter((c) => c.cleaner_id === targetUserId);
				await fulfillJson(route, [
					{
						...toAdminUser(targetUser),
						assigned_cleanings: assignedCleanings.map((c) => {
							const prop = properties.find((p) => p.id === c.property_id);
							return {
								id: c.id,
								status: c.status,
								scheduled_start: c.scheduled_start,
								service_cost: c.service_cost,
								cleaner_pay: c.cleaner_pay,
								host_id: c.host_id,
								property_id: c.property_id,
								clock_in_time: c.clock_in_time,
								clock_out_time: c.clock_out_time,
								created_at: c.created_at,
								host_name: _allUsers.find((u) => u.id === c.host_id)?.full_name ?? null,
								property_address: prop?.address_line_1 ?? null,
								property_postcode: prop?.postcode ?? null,
								property_town_city: prop?.town_city ?? null,
							};
						}),
						cleaner_stats: {
							total_assigned: assignedCleanings.length,
							completed: assignedCleanings.filter((c) => c.status === 'completed').length,
							confirmed: assignedCleanings.filter(
								(c) => c.status === 'confirmed' || c.status === 'in_progress',
							).length,
							avg_completion_hours:
								assignedCleanings.filter((c) => c.status === 'completed').length > 0 ? 1.5 : null,
						},
					},
				]);
				return;
			}

			case 'get_cleaner_pay_config':
			case 'admin_get_cleaner_pay_config':
			case 'get_pay_rates':
				await fulfillJson(route, [
					{
						hourly_rate: 15,
						bedroom_time: 30,
						bathroom_time: 20,
						common_time: 15,
						target_times: { bedroom: 30, bathroom: 20, common: 15 },
					},
				]);
				return;
			case 'update_cleaner_pay_config':
				await fulfillJson(route, { success: true });
				return;

			case 'admin_update_standard_tasks':
				await fulfillJson(route, { success: true });
				return;

			case 'admin_assign_cleaner':
			case 'admin_unassign_cleaner':
			case 'admin_ban_user':
			case 'admin_unban_user':
			case 'admin_invite_user':
			case 'create_cleaning_request':
			case 'host_cancel_cleaning':
			case 'soft_delete_cleaning':
			case 'soft_delete_property':
			case 'purge_user_pii':
			case 'update_cleaning_request':
				await fulfillJson(route, { success: true });
				return;

			case 'get_or_create_notification_preferences':
				await fulfillJson(route, user.id);
				return;

			default:
				await fulfillJson(route, {});
		}
	});

	// ── Mock geolocation so clock-in doesn't hang ──────────
	await page.addInitScript(() => {
		const mockLat = 51.5074;
		const mockLng = -0.1278;
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				getCurrentPosition: (success: PositionCallback) => {
					success({
						coords: {
							latitude: mockLat,
							longitude: mockLng,
							accuracy: 50,
							altitude: null,
							altitudeAccuracy: null,
							heading: null,
							speed: null,
						},
						timestamp: Date.now(),
					} as GeolocationPosition);
				},
			},
			writable: false,
			configurable: false,
		});
		const origFetch = window.fetch.bind(window);
		window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (url.includes('api.postcodes.io/postcodes/')) {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							status: 200,
							result: { latitude: mockLat, longitude: mockLng },
						}),
						{ status: 200, headers: { 'content-type': 'application/json' } },
					),
				);
			}
			return origFetch(input, init);
		};
	});

	// ── Storage (file uploads) ─────────────────────────────

	await page.route(/\/storage\/v1\/object\//, async (route: Route) => {
		const method = route.request().method();
		if (method === 'POST' || method === 'PUT') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ Key: 'mock-key', Id: 'mock-file-id' }),
			});
		} else if (method === 'GET') {
			await route.fulfill({ status: 200, contentType: 'image/webp', body: '' });
		} else {
			await route.fallback();
		}
	});

	// ── Postcodes.io geolocation ───────────────────────────

	await page.route(/\/\/api\.postcodes\.io\/postcodes\//, async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ status: 200, result: { latitude: 51.5, longitude: -0.13 } }),
		});
	});
}

// ── High-Level Convenience Wrappers ──────────────────────────

export async function setupHostMocks(
	page: Page,
	overrides?: {
		properties?: MockProperty[];
		cleanings?: MockCleaning[];
		tasks?: MockTask[];
	},
): Promise<MockUser> {
	const user = buildUser('host');
	await seedAuthSession(page, user);
	await setupSupabaseMocks(page, {
		user,
		properties: overrides?.properties ?? [buildProperty()],
		cleanings: overrides?.cleanings ?? [buildCleaning()],
		tasks: overrides?.tasks ?? [],
	});
	return user;
}

export async function setupCleanerMocks(
	page: Page,
	overrides?: {
		properties?: MockProperty[];
		cleanings?: MockCleaning[];
		tasks?: MockTask[];
		users?: MockUser[];
	},
): Promise<MockUser> {
	const user = buildUser('cleaner');
	await seedAuthSession(page, user);
	const defaultProperties = overrides?.properties ?? [buildProperty()];
	const defaultCleanings = overrides?.cleanings ?? [
		buildCleaning({ cleaner_id: user.id, status: 'confirmed' }),
		buildCleaning({
			id: MOCK_UUIDS.CLEANING_2,
			cleaner_id: user.id,
			status: 'in_progress',
			clock_in_time: '2025-07-01T09:00:00Z',
		}),
	];
	const defaultTasks = overrides?.tasks ?? [
		buildTask({ cleaning_id: MOCK_UUIDS.CLEANING_1 }),
		buildTask({
			id: MOCK_UUIDS.TASK_2,
			cleaning_id: MOCK_UUIDS.CLEANING_1,
			description: 'Clean kitchen surfaces',
		}),
		buildTask({
			id: MOCK_UUIDS.TASK_3,
			cleaning_id: MOCK_UUIDS.CLEANING_2,
			description: 'Mop floors',
		}),
	];
	await setupSupabaseMocks(page, {
		user,
		properties: defaultProperties,
		cleanings: defaultCleanings,
		tasks: defaultTasks,
		users: overrides?.users ?? [],
	});
	return user;
}

export async function setupAdminMocks(
	page: Page,
	overrides?: {
		users?: MockUser[];
		properties?: MockProperty[];
		cleanings?: MockCleaning[];
		tasks?: MockTask[];
		standardTasks?: MockStandardTask[];
	},
): Promise<MockUser> {
	const adminUser = buildUser('admin');
	await seedAuthSession(page, adminUser);

	const defaultUsers = overrides?.users ?? [
		buildUser('host'),
		buildUser('cleaner'),
		buildUser('cleaner', {
			id: MOCK_UUIDS.CLEANER_2,
			full_name: 'Diana Cleaner',
			email: 'diana@example.com',
		}),
	];
	const defaultProperties = overrides?.properties ?? [
		buildProperty(),
		buildProperty({
			id: MOCK_UUIDS.PROPERTY_2,
			address_line_1: '456 Oak Avenue',
			type: 'house',
			bedrooms: 3,
			bathrooms: 2,
		}),
	];
	const defaultCleanings = overrides?.cleanings ?? [
		buildCleaning({ status: 'requested', cleaner_id: null }),
		buildCleaning({
			id: MOCK_UUIDS.CLEANING_2,
			status: 'confirmed',
			cleaner_id: MOCK_UUIDS.CLEANER,
		}),
		buildCleaning({
			id: MOCK_UUIDS.CLEANING_3,
			status: 'completed',
			cleaner_id: MOCK_UUIDS.CLEANER,
			clock_in_time: '2025-06-30T09:00:00Z',
			clock_out_time: '2025-06-30T11:30:00Z',
		}),
	];
	const defaultStandardTasks = overrides?.standardTasks ?? [
		buildStandardTask(),
		buildStandardTask({
			id: MOCK_UUIDS.STANDARD_TASK_2,
			description: 'Clean all windows',
			sort_order: 1,
		}),
	];

	await setupSupabaseMocks(
		page,
		{
			user: adminUser,
			properties: defaultProperties,
			cleanings: defaultCleanings,
			tasks: overrides?.tasks ?? [],
			standardTasks: defaultStandardTasks,
			users: defaultUsers,
		},
		{ isAdmin: true },
	);
	return adminUser;
}
