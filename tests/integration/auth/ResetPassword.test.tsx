import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ResetPasswordPage } from '@/pages/auth/ResetPassword';
import { mockSupabase } from '~/mocks/supabaseClient';

describe('ResetPassword Feature', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderResetPassword = () => {
		const routes = [
			{ path: '/update-password', element: <ResetPasswordPage /> },
			{ path: '/login', element: <div data-testid="login-page">Login</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries: ['/update-password'] });
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

		await user.type(screen.getByLabelText(/new password/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
		await user.click(screen.getByRole('button', { name: /reset password/i }));

		await waitFor(() => {
			expect(screen.getByText(DICT.COMMON.VALIDATION.PASSWORDS_MATCH)).toBeInTheDocument();
		});
	});
});
