import { MOCK_CREDENTIALS, MOCK_UUIDS } from '../constants';

export interface MockUser {
	id: string;
	email: string;
	full_name: string;
	role: 'host' | 'cleaner' | 'admin';
	avatar_url: string | null;
	is_verified: boolean;
	created_at: string;
	last_seen_at: string;
	is_online: boolean;
}

export interface MockProperty {
	id: string;
	host_id: string;
	type: 'house' | 'apartment' | 'studio';
	address_line_1: string;
	address_line_2: string | null;
	town_city: string;
	postcode: string;
	bedrooms: number;
	bathrooms: number;
	main_image_url: string | null;
	extra_images_urls: string[] | null;
	price_per_cleaning: number | null;
	created_at: string;
	updated_at: string;
}

export interface MockCleaning {
	id: string;
	host_id: string;
	property_id: string;
	cleaner_id: string | null;
	status: string;
	scheduled_start: string;
	scheduled_end: string | null;
	service_cost: number | null;
	cleaner_pay: number | null;
	stocks_included: boolean;
	information: string | null;
	clock_in_time: string | null;
	clock_out_time: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export interface MockTask {
	id: string;
	cleaning_id: string;
	description: string;
	is_completed: boolean;
	is_custom: boolean;
	created_at: string;
}

export interface MockStandardTask {
	id: string;
	description: string;
	is_active: boolean;
	sort_order: number;
	created_at: string;
}

export interface MockEvidence {
	id: string;
	cleaning_id: string;
	uploader_id: string;
	media_url: string;
	type: 'image' | 'video';
}

export interface MockReport {
	id: string;
	cleaning_id: string;
	cleaner_id: string;
	broken_items_report: string | null;
	low_supplies_report: string | null;
	created_at: string;
}

export interface MockData {
	user: MockUser;
	properties?: MockProperty[];
	cleanings?: MockCleaning[];
	tasks?: MockTask[];
	standardTasks?: MockStandardTask[];
	users?: MockUser[];
}

function now(): string {
	return new Date().toISOString();
}

function scheduledStartAgo(minutesAgo = 30): string {
	const d = new Date();
	const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes();
	const safeMinutes = Math.min(minutesAgo, minutesSinceMidnight);
	if (safeMinutes <= 0) {
		return d.toISOString();
	}
	return new Date(Date.now() - safeMinutes * 60_000).toISOString();
}

export { now, scheduledStartAgo };

export function buildUser(
	role: 'host' | 'cleaner' | 'admin',
	overrides?: Partial<MockUser>,
): MockUser {
	const defaults: Record<string, MockUser> = {
		host: {
			id: MOCK_UUIDS.HOST,
			email: MOCK_CREDENTIALS.HOST.email,
			role: 'host',
			full_name: 'Alice Host',
			avatar_url: null,
			is_verified: false,
			created_at: '2025-01-01T00:00:00Z',
			last_seen_at: '2025-06-28T12:00:00Z',
			is_online: true,
		},
		cleaner: {
			id: MOCK_UUIDS.CLEANER,
			email: MOCK_CREDENTIALS.CLEANER.email,
			role: 'cleaner',
			full_name: 'Bob Cleaner',
			avatar_url: null,
			is_verified: true,
			created_at: '2025-01-15T00:00:00Z',
			last_seen_at: '2025-06-29T08:00:00Z',
			is_online: true,
		},
		admin: {
			id: MOCK_UUIDS.ADMIN,
			email: MOCK_CREDENTIALS.ADMIN.email,
			role: 'admin',
			full_name: 'Charlie Admin',
			avatar_url: null,
			is_verified: true,
			created_at: '2024-12-01T00:00:00Z',
			last_seen_at: '2025-06-29T09:00:00Z',
			is_online: true,
		},
	};
	return { ...defaults[role], ...overrides };
}

export function buildProperty(overrides?: Partial<MockProperty>): MockProperty {
	return {
		id: MOCK_UUIDS.PROPERTY_1,
		host_id: MOCK_UUIDS.HOST,
		type: 'apartment',
		address_line_1: '123 Test Street',
		address_line_2: null,
		town_city: 'London',
		postcode: 'SW1A 1AA',
		bedrooms: 2,
		bathrooms: 1,
		main_image_url: null,
		extra_images_urls: null,
		price_per_cleaning: null,
		created_at: '2025-06-01T00:00:00Z',
		updated_at: '2025-06-01T00:00:00Z',
		...overrides,
	};
}

export function buildCleaning(overrides?: Partial<MockCleaning>): MockCleaning {
	return {
		id: MOCK_UUIDS.CLEANING_1,
		host_id: MOCK_UUIDS.HOST,
		property_id: MOCK_UUIDS.PROPERTY_1,
		cleaner_id: null,
		status: 'requested',
		scheduled_start: scheduledStartAgo(),
		scheduled_end: null,
		service_cost: 75.0,
		cleaner_pay: null,
		stocks_included: false,
		information: null,
		clock_in_time: null,
		clock_out_time: null,
		created_at: '2025-06-15T00:00:00Z',
		updated_at: '2025-06-15T00:00:00Z',
		deleted_at: null,
		...overrides,
	};
}

export function buildTask(overrides?: Partial<MockTask>): MockTask {
	return {
		id: MOCK_UUIDS.TASK_1,
		cleaning_id: MOCK_UUIDS.CLEANING_1,
		description: 'Vacuum all rooms',
		is_completed: false,
		is_custom: false,
		created_at: '2025-06-15T00:00:00Z',
		...overrides,
	};
}

export function buildStandardTask(overrides?: Partial<MockStandardTask>): MockStandardTask {
	return {
		id: MOCK_UUIDS.STANDARD_TASK_1,
		description: 'Vacuum all rooms',
		is_active: true,
		sort_order: 0,
		created_at: '2025-01-01T00:00:00Z',
		...overrides,
	};
}
