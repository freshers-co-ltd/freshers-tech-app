import type { AdminCleaning } from '@/features/admin/cleaningService';
import type { CleaningStatus } from '@/features/cleanings/cleaningService';

export function buildAdminCleaning(overrides?: Partial<AdminCleaning>): AdminCleaning {
	return {
		id: 'admin_cln_123',
		host_id: 'user_123',
		property_id: 'property_123',
		cleaner_id: null,
		status: 'requested' as CleaningStatus,
		scheduled_start: new Date().toISOString(),
		service_cost: 120,
		cleaner_pay: null,
		information: null,
		stocks_included: false,
		clock_in_time: null,
		clock_out_time: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		deleted_at: null,
		host_name: 'Test Host',
		cleaner_name: null,
		property_address: '456 Admin Road',
		property_postcode: 'SW1A 1AA',
		property_town_city: 'London',
		...overrides,
	};
}
