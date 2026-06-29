import type { CleaningRequest } from '@/features/cleanings/types';

export function buildCleaning(overrides?: Partial<CleaningRequest>): CleaningRequest {
	return {
		id: 'cleaning_123',
		host_id: 'user_123',
		cleaner_id: null,
		property_id: 'property_123',
		status: 'requested',
		scheduled_start: new Date().toISOString(),
		information: null,
		stocks_included: false,
		service_cost: null,
		cleaner_pay: null,
		clock_in_time: null,
		clock_out_time: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		deleted_at: null,
		property: {
			id: 'property_123',
			host_id: 'user_123',
			address_line_1: '123 Test Street',
			address_line_2: null,
			town_city: 'London',
			postcode: 'SW1A 1AA',
			type: 'house',
			bedrooms: 3,
			bathrooms: 2,
			main_image_url: '',
			extra_images_urls: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			deleted_at: null,
		},
		cleaner: null,
		tasks: [],
		evidence: [],
		report: null,
		...overrides,
	};
}

/**
 * Build a cleaning in the raw format returned by Supabase queries,
 * which includes cleading_tasks / cleaning_reports fields.
 * This format passes the isRawCleaningQueryResult check in the service layer.
 */
export function buildRawCleaning(overrides?: Partial<CleaningRequest>) {
	const cleaning = buildCleaning(overrides);
	return {
		...cleaning,
		cleaning_tasks: cleaning.tasks,
		cleaning_reports: cleaning.report ? [cleaning.report] : [],
	};
}
