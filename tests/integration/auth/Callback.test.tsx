import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthCallback } from '@/pages/auth/Callback';
import { mockSupabase } from '~/mocks/supabaseClient';

describe('AuthCallback Feature', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderCallback = (initialEntries: string[]) => {
		const routes = [
			{ path: '/auth/callback', element: <AuthCallback /> },
			{ path: '/dashboard', element: <div data-testid="dashboard">Dashboard</div> },
			{ path: '/login', element: <div data-testid="login-page">Login</div> },
		];
		const router = createMemoryRouter(routes, { initialEntries });
		render(
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>,
		);
		return { router };
	};

	it('exchanges code for session and redirects to dashboard', async () => {
		const { router } = renderCallback(['/auth/callback?code=valid-code']);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe('/dashboard');
		});
	});

	it('shows error and redirects to login when code exchange fails', async () => {
		mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
			data: { user: null, session: null },
			error: { code: 'bad_code', message: 'Invalid code' },
		});

		const { router } = renderCallback(['/auth/callback?code=invalid-code']);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe('/login');
		});
		expect(toast.error).toHaveBeenCalledWith(DICT.ERRORS.AUTH.LINK_EXPIRED);
	});
});
