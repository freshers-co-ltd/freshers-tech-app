import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { LoginPage } from '@/pages/auth/Login';
import { mockSupabase } from '~/mocks/supabaseClient';

describe('Login Feature', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderLogin = () => {
		const routes = [
			{ path: '/login', element: <LoginPage /> },
			{ path: '/dashboard', element: <div data-testid="dashboard">Welcome to Dashboard</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries: ['/login'] });
		render(
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>,
		);
		return { router };
	};

	it('navigates to dashboard on successful authentication', async () => {
		const user = userEvent.setup();

		renderLogin();

		await user.type(screen.getByLabelText(/^email$/i), 'user@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'password123');
		await user.click(screen.getByRole('button', { name: /log in/i }));

		expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
		expect(toast.success).toHaveBeenCalledWith(DICT.AUTH.LOGIN.TOAST_SUCCESS, expect.anything());
	});

	it('displays error message when credentials are invalid', async () => {
		const user = userEvent.setup();
		mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
			data: { user: null, session: null },
			error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
		});

		renderLogin();

		await user.type(screen.getByLabelText(/^email$/i), 'wrong@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
		await user.click(screen.getByRole('button', { name: /log in/i }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(DICT.ERRORS.AUTH.INVALID_CREDENTIALS);
		});
	});

	it('prevents submission and shows validation errors for empty fields', async () => {
		const user = userEvent.setup();
		renderLogin();

		await user.click(screen.getByRole('button', { name: /log in/i }));

		expect(await screen.findByText(DICT.COMMON.VALIDATION.EMAIL_INVALID)).toBeInTheDocument();
		expect(screen.getByText(DICT.COMMON.VALIDATION.PASSWORD_REQUIRED)).toBeInTheDocument();
	});
});
