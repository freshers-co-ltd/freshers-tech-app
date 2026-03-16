import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthContext';
import { SignupPage } from '@/pages/auth/Signup';
import { server } from '~/server';

describe('Signup Feature', () => {
	beforeAll(() => server.listen());
	afterEach(() => {
		server.resetHandlers();
		vi.clearAllMocks();
		localStorage.clear();
	});
	afterAll(() => server.close());

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
		server.use(
			http.post('*/auth/v1/signup*', () => {
				return HttpResponse.json({
					access_token: 'fake_token',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'fake_refresh',
					user: {
						id: 'user_123',
						email: 'newuser@example.com',
						aud: 'authenticated',
						role: 'authenticated',
						email_confirmed_at: new Date().toISOString(),
						created_at: new Date().toISOString(),
						last_sign_in_at: new Date().toISOString(),
						app_metadata: { provider: 'email', providers: ['email'] },
						user_metadata: { full_name: 'John Doe', role: 'host' },
						identities: [],
					},
					session: {
						access_token: 'fake_token',
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'fake_refresh',
						user: {
							id: 'user_123',
							email: 'newuser@example.com',
							aud: 'authenticated',
							role: 'authenticated',
						},
					},
				});
			}),
		);

		renderSignup();

		await user.click(screen.getByRole('button', { name: /host/i }));

		await user.type(screen.getByLabelText(/full name/i), 'John Doe');
		await user.type(screen.getByLabelText(/^email$/i), 'newuser@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

		await user.click(screen.getByRole('button', { name: /create account/i }));

		expect(await screen.findByTestId('dashboard', {}, { timeout: 3000 })).toBeInTheDocument();
		expect(toast.success).toHaveBeenCalledWith('Account created successfully', expect.anything());
	});

	it('shows error toast when email is already registered', async () => {
		const user = userEvent.setup();
		server.use(
			http.post('*/auth/v1/signup*', () => {
				return new HttpResponse(
					JSON.stringify({ error: 'User already registered', message: 'User already registered' }),
					{ status: 400 },
				);
			}),
		);

		renderSignup();

		await user.click(screen.getByRole('button', { name: /host/i }));

		await user.type(screen.getByLabelText(/full name/i), 'Existing User');
		await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
		await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
		await user.click(screen.getByRole('button', { name: /create account/i }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('User already registered');
		});
	});
});
