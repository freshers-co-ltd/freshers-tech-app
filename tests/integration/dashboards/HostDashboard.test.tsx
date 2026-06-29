import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DICT } from '@/dictionary';
import { HostDashboardPage } from '@/pages/host/Dashboard';
import { buildRawCleaning } from '~/factories';
import { renderWithProviders } from '~/utils';
import { mockTableData, setMockUserRole } from '~/utils/supabaseMocks';

describe('Host Dashboard', () => {
	let cleanupFrom: (() => void) | null = null;

	afterEach(() => {
		cleanupFrom?.();
		cleanupFrom = null;
		localStorage.clear();
		sessionStorage.clear();
	});

	it('shows stats from cleaning and property data', async () => {
		setMockUserRole('host');
		cleanupFrom = mockTableData({
			cleanings: {
				data: [
					buildRawCleaning({ id: 'c1', status: 'confirmed' }),
					buildRawCleaning({ id: 'c2', status: 'in_progress' }),
					buildRawCleaning({ id: 'c3', status: 'requested' }),
				],
			},
			properties: { data: [{ id: 'p1', host_id: 'user_123' }] },
		});

		renderWithProviders(<HostDashboardPage />, {
			routes: [{ path: '/host/dashboard', element: <HostDashboardPage /> }],
			initialEntries: ['/host/dashboard'],
		});

		const dict = DICT.DASHBOARD.HOST.STATS;
		expect(await screen.findByText(dict.CONFIRMED)).toBeInTheDocument();
		expect(screen.getByText(dict.IN_PROGRESS)).toBeInTheDocument();
		expect(screen.getByText(dict.REQUESTED)).toBeInTheDocument();
		expect(screen.getByText(dict.PROPERTIES)).toBeInTheDocument();
	});

	it('shows CTA card with request cleaning button', async () => {
		setMockUserRole('host');
		cleanupFrom = mockTableData({
			cleanings: { data: [] },
			properties: { data: [] },
		});

		renderWithProviders(<HostDashboardPage />, {
			routes: [{ path: '/host/dashboard', element: <HostDashboardPage /> }],
			initialEntries: ['/host/dashboard'],
		});

		expect(
			await screen.findByRole('button', { name: DICT.DASHBOARD.HOST.CTA_CARD.BUTTON }),
		).toBeInTheDocument();
	});
});
