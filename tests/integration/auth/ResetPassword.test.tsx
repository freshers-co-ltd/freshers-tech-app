import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ResetPasswordPage } from '@/pages/auth/ResetPassword';
import { mockSupabase, triggerAuthEvent } from '~/mocks/supabaseClient';

const recoverySession = {
	access_token: 'recovery-token',
	token_type: 'bearer',
	expires_in: 3600,
	refresh_token: 'recovery-refresh',
	user: {
		id: 'user_recovery',
		aud: 'authenticated',
		role: 'authenticated',
		email: 'recovery@test.com',
		email_confirmed_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
		last_sign_in_at: new Date().toISOString(),
		app_metadata: { provider: 'email', providers: ['email'] },
		user_metadata: { full_name: 'Recovery User', role: 'host' },
		identities: [],
	},
};

describe('ResetPassword Feature', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderResetPassword = (initialEntry = '/update-password') => {
		const routes = [
			{ path: '/update-password', element: <ResetPasswordPage /> },
			{ path: '/login', element: <div data-testid="login-page">Login</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
		render(
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>,
		);
		return { router };
	};

	it('updates password and redirects to login', async () => {
		const user = userEvent.setup();

		mockSupabase.auth.updateUser.mockResolvedValueOnce({
			data: { user: { id: 'user_123' } },
			error: null,
		});
		mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });

		renderResetPassword();

		await waitFor(() => {
			expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText(/new password/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
		await user.click(screen.getByRole('button', { name: /reset password/i }));

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				DICT.AUTH.RESET_PASSWORD.TOAST_SUCCESS,
				expect.anything(),
			);
		});
	});

	it('shows validation error for password mismatch', async () => {
		const user = userEvent.setup();

		renderResetPassword();

		await waitFor(() => {
			expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText(/new password/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
		await user.click(screen.getByRole('button', { name: /reset password/i }));

		await waitFor(() => {
			expect(screen.getByText(DICT.COMMON.VALIDATION.PASSWORDS_MATCH)).toBeInTheDocument();
		});
	});

	it('reads tokens from hash and sets session on /update-password', async () => {
		mockSupabase.auth.setSession.mockImplementationOnce(async () => {
			triggerAuthEvent('SIGNED_IN', recoverySession);
			return { data: { user: recoverySession.user, session: recoverySession }, error: null };
		});

		const hash = '#access_token=recovery-token&refresh_token=recovery-refresh&type=recovery';
		window.history.replaceState(null, '', `/update-password${hash}`);

		renderResetPassword(`/update-password${hash}`);

		await waitFor(() => {
			expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
		});
	});

	it('shows error view when setSession fails', async () => {
		mockSupabase.auth.setSession.mockResolvedValueOnce({
			data: { user: null, session: null },
			error: { code: 'bad_token', message: 'Invalid recovery token' },
		});

		const hash = '#access_token=bad-token&refresh_token=bad-refresh&type=recovery';
		window.history.replaceState(null, '', `/update-password${hash}`);

		renderResetPassword(`/update-password${hash}`);

		await waitFor(() => {
			expect(screen.getByText(DICT.AUTH.SET_PASSWORD.TITLE_ERROR)).toBeInTheDocument();
		});
		expect(toast.error).toHaveBeenCalledWith(DICT.ERRORS.AUTH.LINK_EXPIRED);
	});

	it('shows error view when no hash params in URL and no session', async () => {
		mockSupabase.auth.getSession.mockResolvedValue({
			data: { session: null },
			error: null,
		});

		window.history.replaceState(null, '', '/update-password');

		renderResetPassword('/update-password');

		await waitFor(() => {
			expect(screen.getByText(DICT.AUTH.SET_PASSWORD.TITLE_ERROR)).toBeInTheDocument();
		});
	});
});
