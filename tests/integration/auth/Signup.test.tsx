import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { SignupPage } from '@/pages/auth/Signup';
import { mockSupabase } from '~/mocks/supabaseClient';

describe('Signup Feature', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	const renderSignup = () => {
		const routes = [
			{ path: '/signup', element: <SignupPage /> },
			{ path: '/dashboard', element: <div data-testid="dashboard">Dashboard</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries: ['/signup'] });
		render(
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>,
		);
		return { router };
	};

	it('completes signup and redirects to dashboard on success', async () => {
		const user = userEvent.setup();

		renderSignup();

		await user.click(screen.getByRole('button', { name: /host/i }));

		await user.type(screen.getByLabelText(/full name/i), 'John Doe');
		await user.type(screen.getByLabelText(/^email$/i), 'newuser@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

		await user.click(screen.getByRole('button', { name: /create account/i }));

		expect(await screen.findByTestId('dashboard', {}, { timeout: 3000 })).toBeInTheDocument();
		expect(toast.success).toHaveBeenCalledWith(DICT.AUTH.SIGNUP.TOAST_SUCCESS, expect.anything());
	});

	it('shows error toast when email is already registered', async () => {
		const user = userEvent.setup();
		mockSupabase.auth.signUp.mockResolvedValueOnce({
			data: { user: null, session: null },
			error: { code: 'user_already_exists', message: 'User already registered' },
		});

		renderSignup();

		await user.click(screen.getByRole('button', { name: /host/i }));

		await user.type(screen.getByLabelText(/full name/i), 'Existing User');
		await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
		await user.click(screen.getByRole('button', { name: /create account/i }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(DICT.ERRORS.AUTH.USER_EXISTS);
		});
	});
});
