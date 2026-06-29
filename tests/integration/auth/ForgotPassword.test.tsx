import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { mockSupabase } from '~/mocks/supabaseClient';

describe('ForgotPassword Feature', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderForgotPassword = () => {
		const routes = [
			{ path: '/forgot-password', element: <ForgotPasswordPage /> },
			{ path: '/login', element: <div data-testid="login-page">Login</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries: ['/forgot-password'] });
		render(
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>,
		);
		return { router };
	};

	it('shows success message when email is sent', async () => {
		const user = userEvent.setup();

		renderForgotPassword();

		await user.type(screen.getByLabelText(/email/i), 'test@example.com');
		await user.click(screen.getByRole('button', { name: /send reset link/i }));

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				DICT.AUTH.FORGOT_PASSWORD.TOAST_SUCCESS,
				expect.anything(),
			);
		});
	});

	it('shows error toast when password reset email fails', async () => {
		const user = userEvent.setup();

		mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
			data: {},
			error: { code: 'over_email_send_rate_limit', message: 'Too many requests' },
		});

		renderForgotPassword();

		await user.type(screen.getByLabelText(/email/i), 'test@example.com');
		await user.click(screen.getByRole('button', { name: /send reset link/i }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Too many requests');
		});
	});
});
