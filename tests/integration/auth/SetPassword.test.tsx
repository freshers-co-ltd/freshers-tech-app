import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { SetPasswordPage } from '@/pages/auth/SetPassword';
import { mockSupabase } from '~/mocks/supabaseClient';

describe('SetPassword Feature', () => {
	beforeEach(() => {
		const mockHash = '#access_token=mock-token&refresh_token=mock-refresh';
		Object.defineProperty(window, 'location', {
			value: {
				hash: mockHash,
			},
			writable: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderSetPassword = () => {
		const routes = [
			{ path: '/set-password', element: <SetPasswordPage /> },
			{ path: '/dashboard', element: <div data-testid="dashboard">Dashboard</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries: ['/set-password'] });
		render(
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>,
		);
		return { router };
	};

	it('sets session and allows password to be set', async () => {
		const user = userEvent.setup();

		renderSetPassword();

		await waitFor(() => {
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText('Password'), 'Password123!');
		await user.type(screen.getByLabelText('Confirm Password'), 'Password123!');
		await user.click(screen.getByRole('button', { name: /create password/i }));

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				DICT.AUTH.SET_PASSWORD.TOAST_SUCCESS,
				expect.anything(),
			);
		});
	});

	it('shows error view when token is invalid', async () => {
		mockSupabase.auth.setSession.mockResolvedValueOnce({
			data: { session: null },
			error: { code: 'bad_jwt', message: 'Invalid token' },
		});

		renderSetPassword();

		await waitFor(() => {
			expect(screen.getByText(DICT.AUTH.SET_PASSWORD.TITLE_ERROR)).toBeInTheDocument();
		});
		expect(screen.getByText(DICT.AUTH.SET_PASSWORD.MESSAGE_ERROR)).toBeInTheDocument();
		expect(toast.error).toHaveBeenCalledWith(DICT.ERRORS.AUTH.LINK_EXPIRED);
	});

	it('shows validation error for password mismatch', async () => {
		const user = userEvent.setup();

		renderSetPassword();

		await waitFor(() => {
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText('Password'), 'Password123!');
		await user.type(screen.getByLabelText('Confirm Password'), 'DifferentPass123!');
		await user.click(screen.getByRole('button', { name: /create password/i }));

		await waitFor(() => {
			expect(screen.getByText(DICT.COMMON.VALIDATION.PASSWORDS_MATCH)).toBeInTheDocument();
		});
	});
});
