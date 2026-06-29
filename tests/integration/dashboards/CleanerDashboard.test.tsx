import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DICT } from '@/dictionary';
import { CleanerDashboardPage } from '@/pages/cleaner/Dashboard';
import { buildRawCleaning } from '~/factories';
import { renderWithProviders } from '~/utils';
import { mockTableData, setMockUserRole } from '~/utils/supabaseMocks';

describe('Cleaner Dashboard', () => {
	let cleanupFrom: (() => void) | null = null;

	afterEach(() => {
		cleanupFrom?.();
		cleanupFrom = null;
		localStorage.clear();
		sessionStorage.clear();
	});

	it('shows stats from cleaning data', async () => {
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData({
			cleanings: {
				data: [
					buildRawCleaning({ id: 'c1', status: 'confirmed', cleaner_id: 'user_123' }),
					buildRawCleaning({ id: 'c2', status: 'in_progress', cleaner_id: 'user_123' }),
					buildRawCleaning({
						id: 'c3',
						status: 'completed',
						cleaner_id: 'user_123',
						cleaner_pay: 50,
					}),
				],
			},
		});

		renderWithProviders(<CleanerDashboardPage />, {
			routes: [{ path: '/cleaner/dashboard', element: <CleanerDashboardPage /> }],
			initialEntries: ['/cleaner/dashboard'],
		});

		const dict = DICT.DASHBOARD.CLEANER.STATS;
		expect(await screen.findByText(dict.ASSIGNED)).toBeInTheDocument();
		expect(screen.getByText(dict.ACTIVE)).toBeInTheDocument();
		expect(screen.getByText(dict.COMPLETED)).toBeInTheDocument();
		expect(screen.getByText(dict.TOTAL_EARNINGS)).toBeInTheDocument();
	});

	it('displays earnings in £X.XX format', async () => {
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData({
			cleanings: {
				data: [
					buildRawCleaning({
						id: 'c1',
						status: 'completed',
						cleaner_id: 'user_123',
						cleaner_pay: 75.5,
					}),
				],
			},
		});

		renderWithProviders(<CleanerDashboardPage />, {
			routes: [{ path: '/cleaner/dashboard', element: <CleanerDashboardPage /> }],
			initialEntries: ['/cleaner/dashboard'],
		});

		expect(await screen.findByText('£75.50')).toBeInTheDocument();
	});

	it('shows £0.00 when there are no completed cleanings', async () => {
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData({
			cleanings: { data: [] },
		});

		renderWithProviders(<CleanerDashboardPage />, {
			routes: [{ path: '/cleaner/dashboard', element: <CleanerDashboardPage /> }],
			initialEntries: ['/cleaner/dashboard'],
		});

		expect(await screen.findByText('£0.00')).toBeInTheDocument();
	});
});
