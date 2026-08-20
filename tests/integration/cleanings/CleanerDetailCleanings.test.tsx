import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DICT } from '@/dictionary';
import { AdminCleanerDetailPage } from '@/pages/admin/CleanerDetail';
import { renderWithProviders } from '~/utils';
import { mockRpcData } from '~/utils/supabaseMocks';

function buildCleanerDetail(overrides?: Record<string, unknown>) {
	return {
		id: 'cleaner_1',
		email: 'cleaner1@example.com',
		full_name: 'Danny Cleaner',
		role: 'cleaner',
		is_verified: true,
		avatar_url: null,
		banned_until: null,
		created_at: '2026-01-01T00:00:00Z',
		last_sign_in_at: '2026-06-01T00:00:00Z',
		last_sign_in_text: 'This month',
		is_online: true,
		last_seen_at: '2026-06-01T00:00:00Z',
		deleted_at: null,
		assigned_cleanings: [
			{
				id: 'cln_1',
				status: 'confirmed',
				scheduled_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				service_cost: 100,
				cleaner_pay: 50,
				host_id: 'host_1',
				property_id: 'prop_1',
				clock_in_time: null,
				clock_out_time: null,
				created_at: '2026-07-01T00:00:00Z',
				host_name: 'Host One',
				property_address: '10 Baker Street',
				property_postcode: 'SW1A 1AA',
				property_town_city: 'London',
			},
			{
				id: 'cln_2',
				status: 'completed',
				scheduled_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
				service_cost: 120,
				cleaner_pay: 60,
				host_id: 'host_2',
				property_id: 'prop_2',
				clock_in_time: null,
				clock_out_time: null,
				created_at: '2026-05-01T00:00:00Z',
				host_name: 'Host Two',
				property_address: '22 High Road',
				property_postcode: 'M1 1AA',
				property_town_city: 'Manchester',
			},
		],
		cleaner_stats: {
			total_assigned: 2,
			completed: 1,
			confirmed: 1,
			avg_completion_hours: null,
		},
		...overrides,
	};
}

describe('Admin Cleaner Detail - Cleanings Filter', () => {
	let cleanupRpc: (() => void) | null = null;

	afterEach(() => {
		cleanupRpc?.();
		cleanupRpc = null;
	});

	const renderPage = () => {
		return renderWithProviders(<AdminCleanerDetailPage />, {
			routes: [
				{
					path: '/admin/users/cleaners/:id',
					element: <AdminCleanerDetailPage />,
				},
			],
			initialEntries: ['/admin/users/cleaners/cleaner_1'],
		});
	};

	const mockDetail = (data?: Record<string, unknown>) => {
		cleanupRpc = mockRpcData({
			admin_get_cleaner_detail: { data: [data ?? buildCleanerDetail()] },
			admin_get_available_cleaners: {
				data: [
					{
						id: 'cleaner_1',
						full_name: 'Danny Cleaner',
						avatar_url: null,
						current_assignments: 2,
						avg_completion_hours: null,
					},
				],
			},
		});
	};

	it('renders the shared filter section with the cleaner dropdown hidden', async () => {
		mockDetail();
		renderPage();

		expect(
			await screen.findByPlaceholderText(DICT.ADMIN.CLEANINGS.FILTERS.SEARCH_PLACEHOLDER),
		).toBeInTheDocument();
		expect(
			screen.getByRole('combobox', { name: DICT.ADMIN.CLEANINGS.FILTERS.STATUS }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('checkbox', { name: DICT.ADMIN.CLEANINGS.FILTERS.ONLY_UPCOMING }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('combobox', { name: DICT.ADMIN.CLEANINGS.FILTERS.CLEANER }),
		).not.toBeInTheDocument();
	});

	it('filters rows by search query across host name and address', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const searchInput = await screen.findByPlaceholderText(
			DICT.ADMIN.CLEANINGS.FILTERS.SEARCH_PLACEHOLDER,
		);
		await user.type(searchInput, 'Baker');

		await waitFor(() => {
			expect(screen.queryAllByText('10 Baker Street').length).toBeGreaterThan(0);
			expect(screen.queryAllByText('22 High Road').length).toBe(0);
		});
	});

	it('filters rows by status', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const statusTrigger = await screen.findByRole('combobox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.STATUS,
		});
		await user.click(statusTrigger);
		await user.click(await screen.findByRole('option', { name: 'Completed' }));

		expect(screen.queryAllByText('10 Baker Street').length).toBe(0);
		expect(screen.queryAllByText('22 High Road').length).toBeGreaterThan(0);
	});

	it('filters rows to only upcoming cleanings', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const upcomingCheckbox = await screen.findByRole('checkbox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.ONLY_UPCOMING,
		});
		await user.click(upcomingCheckbox);

		expect(screen.queryAllByText('10 Baker Street').length).toBeGreaterThan(0);
		expect(screen.queryAllByText('22 High Road').length).toBe(0);
	});

	it('clears all filters and restores all rows', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const searchInput = await screen.findByPlaceholderText(
			DICT.ADMIN.CLEANINGS.FILTERS.SEARCH_PLACEHOLDER,
		);
		await user.type(searchInput, 'Manchester');
		const upcomingCheckbox = screen.getByRole('checkbox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.ONLY_UPCOMING,
		});
		await user.click(upcomingCheckbox);

		await waitFor(() => {
			expect(screen.queryAllByText('10 Baker Street').length).toBe(0);
		});

		await user.click(screen.getByRole('button', { name: DICT.ADMIN.CLEANINGS.FILTERS.CLEAR }));

		await waitFor(() => {
			expect(screen.queryAllByText('10 Baker Street').length).toBeGreaterThan(0);
			expect(screen.queryAllByText('22 High Road').length).toBeGreaterThan(0);
			expect(searchInput).toHaveValue('');
		});
		expect(upcomingCheckbox).not.toBeChecked();
	});
});
