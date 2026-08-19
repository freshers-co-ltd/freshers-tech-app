// @ts-nocheck
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest, type AuthUser } from '../_shared/auth.ts';
import { corsHeaders, getAllowedOrigin, jsonResponse } from '../_shared/cors.ts';
import {
	hashIcalUrl,
	isIcalSource,
	maskIcalUrl,
	normalizeIcalUrl,
	validateCalendarSource,
} from '../_shared/platform.ts';

const FETCH_TIMEOUT_MS = 8_000;

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
	const now = Date.now();
	const entry = rateLimits.get(key);
	if (!entry || now > entry.resetAt) {
		rateLimits.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	entry.count++;
	return entry.count <= maxRequests;
}

async function fetchIcsForValidation(url: string) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { Accept: 'text/calendar' },
			redirect: 'follow',
			signal: controller.signal,
		});
		if (!response.ok) return { status: 'error', error: `HTTP ${response.status}` } as const;
		const body = await response.text();
		return { status: 'ok', body } as const;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Network error';
		return { status: 'error', error: message } as const;
	} finally {
		clearTimeout(timeout);
	}
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
	try {
		return await req.json();
	} catch {
		return {};
	}
}

interface FeedRow {
	id: string;
	owner_id: string;
	property_id: string;
	source: string;
	url_display: string;
	url_hash: string;
	url_secret_id: string | null;
	is_active: boolean;
}

const FEED_SELECT = 'id, property_id, source, url_display, is_active, last_sync_status, last_sync_error, last_synced_at, created_at, updated_at';

async function getFeedRow(admin: SupabaseClient, feedId: string): Promise<FeedRow | null> {
	const { data, error } = await admin
		.from('ical_feeds')
		.select('id, owner_id, property_id, source, url_display, url_hash, url_secret_id, is_active')
		.eq('id', feedId)
		.maybeSingle();
	if (error) throw error;
	return data ? (data as FeedRow) : null;
}

function assertOwnership(feed: FeedRow, auth: AuthUser, isAdmin: boolean): boolean {
	return isAdmin || feed.owner_id === auth.userId;
}

async function handleListFeeds(
	admin: SupabaseClient,
	auth: AuthUser,
	isAdmin: boolean,
	origin: string,
): Promise<Response> {
	let query = admin
		.from('ical_feeds')
		.select(`${FEED_SELECT}, properties(address_line_1, town_city)`)
		.is('properties.deleted_at', null)
		.order('created_at', { ascending: false });
	if (!isAdmin) query = query.eq('owner_id', auth.userId);
	const { data, error } = await query;
	if (error) {
		console.error('[ical-feeds] Failed to list feeds:', error.message);
		return jsonResponse({ error: 'Failed to list calendar feeds' }, 500, origin);
	}
	return jsonResponse({ data: data ?? [] }, 200, origin);
}

async function handleCreateFeed(
	req: Request,
	admin: SupabaseClient,
	auth: AuthUser,
	isAdmin: boolean,
	origin: string,
): Promise<Response> {
	const body = await readJsonBody(req);
	const propertyId = body.propertyId;
	const rawUrl = body.url;
	const source = body.source;
	const confirmGeneric = body.confirmGeneric === true;

	if (typeof propertyId !== 'string' || typeof rawUrl !== 'string' || typeof source !== 'string') {
		return jsonResponse({ error: 'Missing propertyId, url or source' }, 400, origin);
	}
	if (!isIcalSource(source)) {
		return jsonResponse({ error: 'Invalid calendar source' }, 400, origin);
	}

	const { data: property, error: propertyError } = await admin
		.from('properties')
		.select('id, host_id, deleted_at')
		.eq('id', propertyId)
		.maybeSingle();
	if (propertyError) throw propertyError;
	if (!property || property.deleted_at !== null) {
		return jsonResponse({ error: 'Property not found' }, 404, origin);
	}
	if (!isAdmin && property.host_id !== auth.userId) {
		return jsonResponse({ error: 'Forbidden' }, 403, origin);
	}

	let normalized: string;
	try {
		normalized = normalizeIcalUrl(rawUrl);
	} catch {
		return jsonResponse({ error: 'Invalid calendar link' }, 400, origin);
	}

	const validation = await validateCalendarSource({
		url: normalized,
		source,
		confirmGeneric,
		fetchIcs: fetchIcsForValidation,
	});
	if (!validation.ok) {
		return jsonResponse(
			{ error: validation.message, code: validation.code, detectedSource: validation.detectedSource },
			422,
			origin,
		);
	}

	const urlHash = await hashIcalUrl(normalized);
	const urlDisplay = maskIcalUrl(normalized);

	const { data: secretId, error: secretError } = await admin.rpc('store_ical_feed_url', {
		p_url: normalized,
	});
	if (secretError) {
		console.error('[ical-feeds] Failed to store calendar URL:', secretError.message);
		return jsonResponse({ error: 'Failed to save calendar link' }, 500, origin);
	}

	const { data: feed, error: insertError } = await admin
		.from('ical_feeds')
		.insert({
			owner_id: property.host_id,
			property_id: property.id,
			url_secret_id: secretId,
			url_hash: urlHash,
			url_display: urlDisplay,
			source,
			is_active: true,
		})
		.select(FEED_SELECT)
		.single();
	if (insertError) {
		if (insertError.code === '23505') {
			return jsonResponse(
				{ error: 'A feed for this calendar is already connected.', code: 'FEED_EXISTS' },
				409,
				origin,
			);
		}
		console.error('[ical-feeds] Failed to insert feed:', insertError.message);
		return jsonResponse({ error: 'Failed to create calendar feed' }, 500, origin);
	}
	return jsonResponse({ data: feed }, 201, origin);
}

async function handleUpdateFeed(
	req: Request,
	admin: SupabaseClient,
	auth: AuthUser,
	isAdmin: boolean,
	origin: string,
): Promise<Response> {
	const body = await readJsonBody(req);
	const feedId = body.feedId;
	if (typeof feedId !== 'string') return jsonResponse({ error: 'Missing feedId' }, 400, origin);

	const feed = await getFeedRow(admin, feedId);
	if (!feed) return jsonResponse({ error: 'Calendar feed not found' }, 404, origin);
	if (!assertOwnership(feed, auth, isAdmin)) return jsonResponse({ error: 'Forbidden' }, 403, origin);

	const updates: Record<string, unknown> = {};
	let nextSource = feed.source;

	if (body.isActive !== undefined) {
		if (typeof body.isActive !== 'boolean') {
			return jsonResponse({ error: 'Invalid isActive' }, 400, origin);
		}
		updates.is_active = body.isActive;
	}

	if (body.source !== undefined) {
		if (typeof body.source !== 'string' || !isIcalSource(body.source)) {
			return jsonResponse({ error: 'Invalid calendar source' }, 400, origin);
		}
		nextSource = body.source;
		updates.source = nextSource;
	}

	if (body.url !== undefined) {
		if (typeof body.url !== 'string') return jsonResponse({ error: 'Invalid calendar link' }, 400, origin);
		let normalized: string;
		try {
			normalized = normalizeIcalUrl(body.url);
		} catch {
			return jsonResponse({ error: 'Invalid calendar link' }, 400, origin);
		}
		const newHash = await hashIcalUrl(normalized);
		if (newHash !== feed.url_hash) {
			const validation = await validateCalendarSource({
				url: normalized,
				source: nextSource,
				confirmGeneric: body.confirmGeneric === true,
				fetchIcs: fetchIcsForValidation,
			});
			if (!validation.ok) {
				return jsonResponse(
					{ error: validation.message, code: validation.code, detectedSource: validation.detectedSource },
					422,
					origin,
				);
			}
			if (feed.url_secret_id) {
				const { error: updateSecretError } = await admin.rpc('update_ical_feed_url', {
					p_secret_id: feed.url_secret_id,
					p_url: normalized,
				});
				if (updateSecretError) {
					console.error('[ical-feeds] Failed to update calendar URL:', updateSecretError.message);
					return jsonResponse({ error: 'Failed to save calendar link' }, 500, origin);
				}
			} else {
				const { data: newSecretId, error: storeSecretError } = await admin.rpc('store_ical_feed_url', {
					p_url: normalized,
				});
				if (storeSecretError) {
					console.error('[ical-feeds] Failed to store calendar URL:', storeSecretError.message);
					return jsonResponse({ error: 'Failed to save calendar link' }, 500, origin);
				}
				updates.url_secret_id = newSecretId;
			}
			updates.url_hash = newHash;
			updates.url_display = maskIcalUrl(normalized);
		}
	}

	if (updates.source !== undefined && body.url === undefined && feed.url_secret_id) {
		const { data: currentUrl } = await admin.rpc('get_ical_feed_url', { p_feed_id: feedId });
		if (typeof currentUrl === 'string' && currentUrl !== '') {
			const validation = await validateCalendarSource({
				url: currentUrl,
				source: nextSource,
				confirmGeneric: body.confirmGeneric === true,
				fetchIcs: fetchIcsForValidation,
			});
			if (!validation.ok) {
				return jsonResponse(
					{ error: validation.message, code: validation.code, detectedSource: validation.detectedSource },
					422,
					origin,
				);
			}
		}
	}

	if (Object.keys(updates).length === 0) {
		return jsonResponse({ data: feed }, 200, origin);
	}

	const { data: updated, error: updateError } = await admin
		.from('ical_feeds')
		.update(updates)
		.eq('id', feedId)
		.select(FEED_SELECT)
		.single();
	if (updateError) {
		console.error('[ical-feeds] Failed to update feed:', updateError.message);
		return jsonResponse({ error: 'Failed to update calendar feed' }, 500, origin);
	}
	return jsonResponse({ data: updated }, 200, origin);
}

async function handleDeleteFeed(
	req: Request,
	admin: SupabaseClient,
	auth: AuthUser,
	isAdmin: boolean,
	origin: string,
): Promise<Response> {
	const body = await readJsonBody(req);
	const feedId = body.feedId;
	if (typeof feedId !== 'string') return jsonResponse({ error: 'Missing feedId' }, 400, origin);

	const feed = await getFeedRow(admin, feedId);
	if (!feed) return jsonResponse({ error: 'Calendar feed not found' }, 404, origin);
	if (!assertOwnership(feed, auth, isAdmin)) return jsonResponse({ error: 'Forbidden' }, 403, origin);

	const { error } = await admin.from('ical_feeds').delete().eq('id', feedId);
	if (error) {
		console.error('[ical-feeds] Failed to delete feed:', error.message);
		return jsonResponse({ error: 'Failed to delete calendar feed' }, 500, origin);
	}
	return jsonResponse({ data: { id: feedId } }, 200, origin);
}

async function handleSyncFeed(
	req: Request,
	admin: SupabaseClient,
	auth: AuthUser,
	isAdmin: boolean,
	origin: string,
): Promise<Response> {
	const body = await readJsonBody(req);
	const feedId = body.feedId;
	if (typeof feedId !== 'string') return jsonResponse({ error: 'Missing feedId' }, 400, origin);

	const feed = await getFeedRow(admin, feedId);
	if (!feed) return jsonResponse({ error: 'Calendar feed not found' }, 404, origin);
	if (!assertOwnership(feed, auth, isAdmin)) return jsonResponse({ error: 'Forbidden' }, 403, origin);

	const { error } = await admin.rpc('run_ical_sync', { p_feed_id: feedId });
	if (error) {
		console.error('[ical-feeds] Failed to queue sync:', error.message);
		return jsonResponse({ error: 'Failed to start calendar sync' }, 500, origin);
	}
	return jsonResponse({ data: { queued: true, feedId } }, 200, origin);
}

Deno.serve(async (req: Request) => {
	const origin = getAllowedOrigin(req);
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders(origin) });
	}

	const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';
	if (!checkRateLimit(`ical-feeds:${clientIp}`, 60, 60_000)) {
		return jsonResponse({ error: 'Too many requests' }, 429, origin);
	}

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
		if (!supabaseUrl || !serviceRoleKey) {
			return jsonResponse({ error: 'Server configuration error' }, 500, origin);
		}

		const auth = await authenticateRequest(req, { supabaseUrl, anonKey });
		if (!auth) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
		const isAdmin = auth.role === 'admin';
		if (!isAdmin && auth.role !== 'host') {
			return jsonResponse({ error: 'Forbidden' }, 403, origin);
		}

		const admin = createClient(supabaseUrl, serviceRoleKey);
		const url = new URL(req.url);
		const segments = url.pathname.split('/').filter((segment) => segment !== '');
		const functionIndex = segments.indexOf('ical-feeds');
		const routeSegments = functionIndex >= 0 ? segments.slice(functionIndex + 1) : segments;
		const path = `/${routeSegments.join('/')}` || '/';

		if (req.method === 'GET' && path === '/feeds') {
			return await handleListFeeds(admin, auth, isAdmin, origin);
		}
		if (req.method === 'POST' && path === '/create') {
			return await handleCreateFeed(req, admin, auth, isAdmin, origin);
		}
		if (req.method === 'POST' && path === '/update') {
			return await handleUpdateFeed(req, admin, auth, isAdmin, origin);
		}
		if (req.method === 'POST' && path === '/delete') {
			return await handleDeleteFeed(req, admin, auth, isAdmin, origin);
		}
		if (req.method === 'POST' && path === '/sync') {
			return await handleSyncFeed(req, admin, auth, isAdmin, origin);
		}

		return jsonResponse({ error: 'Not found' }, 404, origin);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('[ical-feeds] Fatal error:', message);
		return jsonResponse({ error: 'Internal server error' }, 500, origin);
	}
});