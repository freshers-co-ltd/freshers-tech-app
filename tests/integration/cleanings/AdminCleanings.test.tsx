import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AdminCleaningsPage } from '@/pages/admin/Cleanings';
import { buildAdminCleaning } from '~/factories';
import { renderWithProviders } from '~/utils';
import { mockRpcData } from '~/utils/supabaseMocks';

describe('Admin Cleanings Page', () => {
	let cleanupRpc: (() => void) | null = null;

	afterEach(() => {
		cleanupRpc?.();
		cleanupRpc = null;
	});

	const renderPage = () => {
		return renderWithProviders(<AdminCleaningsPage />, {
			routes: [{ path: '/admin/cleanings', element: <AdminCleaningsPage /> }],
			initialEntries: ['/admin/cleanings'],
		});
	};

	it('shows cleaning table when data loads', async () => {
		cleanupRpc = mockRpcData({
			admin_get_all_cleanings: { data: [buildAdminCleaning()] },
			admin_get_cleanings_count: { data: 1 },
		});

		renderPage();

		expect(await screen.findByText('Test Host')).toBeInTheDocument();
		expect((await screen.findAllByText('456 Admin Road'))[0]).toBeInTheDocument();
	});

	it('shows empty state when no cleanings', async () => {
		cleanupRpc = mockRpcData({
			admin_get_all_cleanings: { data: [] },
			admin_get_cleanings_count: { data: 0 },
		});

		renderPage();

		expect(await screen.findByText(DICT.ADMIN.CLEANINGS.TITLE)).toBeInTheDocument();
		// The table renders with no rows; the empty message is "No cleaning requests found"
		expect(screen.getByText('No cleaning requests found')).toBeInTheDocument();
	});

	it('shows error toast when loading fails', async () => {
		cleanupRpc = mockRpcData('admin_get_all_cleanings', null, 'Failed to load admin cleanings');

		renderPage();

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Failed to load admin cleanings');
		});
	});

	it('shows cleaner filter dropdown with options', async () => {
		const user = userEvent.setup();
		cleanupRpc = mockRpcData({
			admin_get_all_cleanings: { data: [] },
			admin_get_cleanings_count: { data: 0 },
			admin_get_available_cleaners: {
				data: [
					{
						id: 'cln_1',
						full_name: 'Alice Cleaner',
						avatar_url: null,
						current_assignments: 0,
						avg_completion_hours: null,
					},
				],
			},
		});

		renderPage();

		const cleanerTrigger = screen.getByRole('combobox', {
			name: DICT.ADMIN.CLEANINGS.FILTERS.CLEANER,
		});
		await user.click(cleanerTrigger);

		expect(await screen.findByText('Alice Cleaner')).toBeInTheDocument();
	});
});
