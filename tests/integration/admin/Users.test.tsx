import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AdminUsersPage } from '@/pages/admin/Users';
import { renderWithProviders } from '~/utils';
import { mockRpcData, setMockUserRole } from '~/utils/supabaseMocks';

function buildAdminUser(overrides?: Record<string, unknown>) {
	return {
		id: 'user_1',
		email: 'user1@example.com',
		full_name: 'Alice Smith',
		role: 'host',
		is_verified: true,
		avatar_url: null,
		banned_until: null,
		created_at: '2026-01-15T10:00:00Z',
		last_sign_in_at: '2026-06-28T08:00:00Z',
		last_seen_at: '2026-06-28T08:00:00Z',
		is_online: true,
		deleted_at: null,
		...overrides,
	};
}

describe('Admin Users Page', () => {
	let cleanupRpc: (() => void) | null = null;

	afterEach(() => {
		cleanupRpc?.();
		cleanupRpc = null;
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderPage = () => {
		return renderWithProviders(<AdminUsersPage />, {
			routes: [{ path: '/admin/users', element: <AdminUsersPage /> }],
			initialEntries: ['/admin/users'],
		});
	};

	it('shows user stats bar', async () => {
		setMockUserRole('admin');
		cleanupRpc = mockRpcData({
			admin_get_users: { data: [buildAdminUser()] },
			admin_get_users_count: { data: 1 },
			admin_get_user_stats: {
				data: [
					{
						total_users: 42,
						online_now: 3,
						banned_users: 1,
						recently_online: 7,
						hosts_count: 20,
						cleaners_count: 18,
						admins_count: 4,
						new_users_this_month: 5,
						new_users_last_month: 3,
					},
				],
			},
		});

		renderPage();

		// Stat labels render from the data
		expect(await screen.findByText('Total Users')).toBeInTheDocument();
		expect(screen.getByText('Online')).toBeInTheDocument();
		expect(screen.getByText('Recently Online (7d)')).toBeInTheDocument();
		expect(screen.getByText('Banned')).toBeInTheDocument();
	});

	it('shows users table with data', async () => {
		setMockUserRole('admin');
		cleanupRpc = mockRpcData({
			admin_get_users: { data: [buildAdminUser()] },
			admin_get_users_count: { data: 1 },
			admin_get_user_stats: {
				data: [
					{
						total_users: 1,
						online_now: 1,
						banned_users: 0,
						recently_online: 1,
						hosts_count: 1,
						cleaners_count: 0,
						admins_count: 0,
						new_users_this_month: 0,
						new_users_last_month: 0,
					},
				],
			},
		});

		renderPage();

		// "Alice Smith" renders in both mobile card and desktop table in jsdom
		const nameElements = await screen.findAllByText('Alice Smith');
		expect(nameElements.length).toBeGreaterThanOrEqual(1);
	});

	it('shows error toast when loading users fails', async () => {
		setMockUserRole('admin');
		cleanupRpc = mockRpcData('admin_get_users', null, 'Failed to load users');

		renderPage();

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Failed to load users');
		});
	});

	it('opens invite user dialog when invite button clicked', async () => {
		const user = userEvent.setup();
		setMockUserRole('admin');
		cleanupRpc = mockRpcData({
			admin_get_users: { data: [] },
			admin_get_users_count: { data: 0 },
			admin_get_user_stats: {
				data: [
					{
						total_users: 0,
						online_now: 0,
						banned_users: 0,
						recently_online: 0,
						hosts_count: 0,
						cleaners_count: 0,
						admins_count: 0,
						new_users_this_month: 0,
						new_users_last_month: 0,
					},
				],
			},
		});

		renderPage();

		const inviteButton = await screen.findByRole('button', { name: /invite user/i });
		await user.click(inviteButton);

		expect(screen.getByText(DICT.ADMIN.USERS.INVITE_USER.TITLE)).toBeInTheDocument();
	});
});
