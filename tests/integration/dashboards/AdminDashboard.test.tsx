import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DICT } from '@/dictionary';
import { AdminDashboardPage } from '@/pages/admin/Dashboard';
import { renderWithProviders } from '~/utils';
import { mockTableData, setMockUserRole } from '~/utils/supabaseMocks';

describe('Admin Dashboard', () => {
	let cleanupFrom: (() => void) | null = null;

	afterEach(() => {
		cleanupFrom?.();
		cleanupFrom = null;
		localStorage.clear();
		sessionStorage.clear();
	});

	it('shows platform stats from platform_stats table', async () => {
		setMockUserRole('admin');
		cleanupFrom = mockTableData({
			platform_stats: {
				data: {
					completed_cleanings_mtd: 10,
					cleanings_in_progress: 3,
					avg_completion_hours: 2.5,
					total_properties: 25,
				},
			},
		});

		renderWithProviders(<AdminDashboardPage />, {
			routes: [{ path: '/admin/dashboard', element: <AdminDashboardPage /> }],
			initialEntries: ['/admin/dashboard'],
		});

		const dict = DICT.DASHBOARD.ADMIN.STATS;
		expect(await screen.findByText(dict.COMPLETED_THIS_MONTH)).toBeInTheDocument();
		expect(screen.getByText(dict.IN_PROGRESS)).toBeInTheDocument();
		expect(screen.getByText(dict.AVG_COMPLETION_TIME)).toBeInTheDocument();
		expect(screen.getByText(dict.TOTAL_PROPERTIES)).toBeInTheDocument();
	});
});
