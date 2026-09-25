import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DICT } from '@/dictionary';
import { AdminHostDetailPage } from '@/pages/admin/HostDetail';
import { buildProperty } from '~/factories';
import { renderWithProviders } from '~/utils';
import { mockRpcData } from '~/utils/supabaseMocks';

const bakerStreet = buildProperty({
	id: 'prop_1',
	host_id: 'host_1',
	address_line_1: '10 Baker Street',
	postcode: 'SW1A 1AA',
	town_city: 'London',
});

const highRoad = buildProperty({
	id: 'prop_2',
	host_id: 'host_1',
	address_line_1: '22 High Road',
	postcode: 'M1 1AA',
	town_city: 'Manchester',
});

function buildHostDetail(overrides?: Record<string, unknown>) {
	return {
		id: 'host_1',
		email: 'host1@example.com',
		full_name: 'Host One',
		role: 'host',
		is_verified: true,
		avatar_url: null,
		banned_until: null,
		created_at: '2026-01-01T00:00:00Z',
		last_sign_in_at: '2026-06-01T00:00:00Z',
		last_sign_in_text: 'This month',
		is_online: true,
		last_seen_at: '2026-06-01T00:00:00Z',
		deleted_at: null,
		is_invited: false,
		host_subscription_status: null,
		properties: [bakerStreet, highRoad],
		cleanings: [
			{
				id: 'cln_1',
				status: 'confirmed',
				scheduled_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				service_cost: 100,
				cleaner_pay: 50,
				cleaner_id: 'cleaner_1',
				cleaner_name: 'Danny Cleaner',
				property_id: 'prop_1',
				created_at: '2026-07-01T00:00:00Z',
			},
			{
				id: 'cln_2',
				status: 'completed',
				scheduled_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
				service_cost: 120,
				cleaner_pay: 60,
				cleaner_id: null,
				cleaner_name: null,
				property_id: 'prop_2',
				created_at: '2026-05-01T00:00:00Z',
			},
		],
		cleaning_stats: {
			total: 2,
			requested: 0,
			confirmed: 1,
			in_progress: 0,
		},
		...overrides,
	};
}

describe('Admin Host Detail - Cleanings Filter', () => {
	let cleanupRpc: (() => void) | null = null;

	afterEach(() => {
		cleanupRpc?.();
		cleanupRpc = null;
	});

	const renderPage = () => {
		return renderWithProviders(<AdminHostDetailPage />, {
			routes: [{ path: '/admin/users/hosts/:id', element: <AdminHostDetailPage /> }],
			initialEntries: ['/admin/users/hosts/host_1'],
		});
	};

	const mockDetail = (data?: Record<string, unknown>) => {
		cleanupRpc = mockRpcData({
			admin_get_host_detail: { data: [data ?? buildHostDetail()] },
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

	it('renders the shared filter section with the cleaner dropdown shown', async () => {
		mockDetail();
		renderPage();

		expect(
			await screen.findByPlaceholderText(DICT.ADMIN.CLEANINGS.FILTERS.SEARCH_PLACEHOLDER),
		).toBeInTheDocument();
		expect(
			screen.getByRole('combobox', { name: DICT.ADMIN.CLEANINGS.FILTERS.STATUS }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('combobox', { name: DICT.ADMIN.CLEANINGS.FILTERS.CLEANER }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('checkbox', { name: DICT.ADMIN.CLEANINGS.FILTERS.ONLY_UPCOMING }),
		).toBeInTheDocument();
	});

	it('filters rows by search query across cleaner name and address', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const searchInput = await screen.findByPlaceholderText(
			DICT.ADMIN.CLEANINGS.FILTERS.SEARCH_PLACEHOLDER,
		);
		await user.type(searchInput, 'Danny');

		await waitFor(() => {
			expect(screen.queryAllByText('Danny Cleaner').length).toBeGreaterThan(0);
			expect(screen.queryAllByText('Unassigned').length).toBe(0);
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

		expect(screen.queryAllByText('Danny Cleaner').length).toBe(0);
		expect(screen.queryAllByText('Unassigned').length).toBeGreaterThan(0);
	});

	it('filters rows by cleaner', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const cleanerTrigger = await screen.findByRole('combobox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.CLEANER,
		});
		await user.click(cleanerTrigger);
		await user.click(await screen.findByRole('option', { name: 'Danny Cleaner' }));

		expect(screen.queryAllByText('Danny Cleaner').length).toBeGreaterThan(0);
		expect(screen.queryAllByText('Unassigned').length).toBe(0);
	});

	it('filters rows to unassigned cleanings', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const cleanerTrigger = await screen.findByRole('combobox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.CLEANER,
		});
		await user.click(cleanerTrigger);
		await user.click(
			await screen.findByRole('option', { name: DICT.ADMIN.CLEANINGS.FILTERS.UNASSIGNED }),
		);

		expect(screen.queryAllByText('Danny Cleaner').length).toBe(0);
		expect(screen.queryAllByText('Unassigned').length).toBeGreaterThan(0);
	});

	it('filters rows to only upcoming cleanings', async () => {
		const user = userEvent.setup();
		mockDetail({
			...buildHostDetail(),
			cleanings: [
				{
					id: 'cln_1',
					status: 'confirmed',
					scheduled_start: '2026-12-10T10:00:00Z',
					service_cost: 100,
					cleaner_pay: 50,
					cleaner_id: 'cleaner_1',
					cleaner_name: 'Danny Cleaner',
					property_id: 'prop_1',
					created_at: '2026-07-01T00:00:00Z',
				},
				{
					id: 'cln_2',
					status: 'completed',
					scheduled_start: '2026-06-01T10:00:00Z',
					service_cost: 120,
					cleaner_pay: 60,
					cleaner_id: null,
					cleaner_name: null,
					property_id: 'prop_2',
					created_at: '2026-05-01T00:00:00Z',
				},
			],
		});
		renderPage();

		const upcomingCheckbox = await screen.findByRole('checkbox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.ONLY_UPCOMING,
		});
		await user.click(upcomingCheckbox);

		expect(screen.queryAllByText('Danny Cleaner').length).toBeGreaterThan(0);
		expect(screen.queryAllByText('Unassigned').length).toBe(0);
	});

	it('clears all filters and restores all rows', async () => {
		const user = userEvent.setup();
		mockDetail();
		renderPage();

		const searchInput = await screen.findByPlaceholderText(
			DICT.ADMIN.CLEANINGS.FILTERS.SEARCH_PLACEHOLDER,
		);
		await user.type(searchInput, 'Danny');

		await waitFor(() => {
			expect(screen.queryAllByText('Unassigned').length).toBe(0);
		});

		const cleanerTrigger = screen.getByRole('combobox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.CLEANER,
		});
		await user.click(cleanerTrigger);
		await user.click(
			await screen.findByRole('option', { name: DICT.ADMIN.CLEANINGS.FILTERS.UNASSIGNED }),
		);

		await waitFor(() => {
			expect(screen.queryAllByText('Danny Cleaner').length).toBe(0);
		});

		await user.click(screen.getByRole('button', { name: DICT.ADMIN.CLEANINGS.FILTERS.CLEAR }));

		await waitFor(() => {
			expect(screen.queryAllByText('Danny Cleaner').length).toBeGreaterThan(0);
			expect(screen.queryAllByText('Unassigned').length).toBeGreaterThan(0);
			expect(searchInput).toHaveValue('');
		});
	});
});
