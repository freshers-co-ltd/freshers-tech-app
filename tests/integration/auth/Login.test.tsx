import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthContext';
import { LoginPage } from '@/pages/auth/Login';
import { server } from '~/server';

describe('Login Feature', () => {
	beforeAll(() => server.listen());
	afterEach(() => {
		server.resetHandlers();
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});
	afterAll(() => server.close());

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
		const fakeJwt = 'header.payload.signature';

		server.use(
			http.post('*/auth/v1/token*', () => {
				return HttpResponse.json({
					access_token: fakeJwt,
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'fake-refresh',
					user: {
						id: '123',
						email: 'user@example.com',
						aud: 'authenticated',
						role: 'authenticated',
						email_confirmed_at: new Date().toISOString(),
						created_at: new Date().toISOString(),
						last_sign_in_at: new Date().toISOString(),
						app_metadata: { provider: 'email', providers: ['email'] },
						user_metadata: { full_name: 'Test User', role: 'host' },
						identities: [],
					},
					session: {
						access_token: fakeJwt,
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'fake-refresh',
						user: {
							id: '123',
							email: 'user@example.com',
							aud: 'authenticated',
							role: 'authenticated',
						},
					},
				});
			}),
			http.get('*/rest/v1/profiles*', () => {
				return HttpResponse.json([{ id: '123', role: 'host', full_name: 'Test User' }]);
			}),
			http.get('*/auth/v1/user', () => {
				return HttpResponse.json({
					id: '123',
					email: 'user@example.com',
					aud: 'authenticated',
					role: 'authenticated',
				});
			}),
		);

		renderLogin();

		await user.type(screen.getByLabelText(/^email$/i), 'user@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'password123');
		await user.click(screen.getByRole('button', { name: /log in/i }));

		expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
		expect(toast.success).toHaveBeenCalled();
	});

	it('displays error message when credentials are invalid', async () => {
		const user = userEvent.setup();
		server.use(
			http.post('*/auth/v1/token*', () => {
				return new HttpResponse(
					JSON.stringify({
						error: 'invalid_grant',
						error_description: 'Invalid login credentials',
					}),
					{ status: 400 },
				);
			}),
		);

		renderLogin();

		await user.type(screen.getByLabelText(/^email$/i), 'wrong@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
		await user.click(screen.getByRole('button', { name: /log in/i }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it('prevents submission and shows validation errors for empty fields', async () => {
		const user = userEvent.setup();
		renderLogin();

		await user.click(screen.getByRole('button', { name: /log in/i }));

		expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
		expect(screen.getByText(/password is required/i)).toBeInTheDocument();
	});
});
