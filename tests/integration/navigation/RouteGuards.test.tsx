import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProtectedRoute, PublicRoute } from '@/features/auth/RouteGuards';
import { mockSupabase } from '~/mocks/supabaseClient';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

describe('RouteGuards', () => {
	afterEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	describe('ProtectedRoute', () => {
		it('redirects unauthenticated users to login', async () => {
			mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
			mockSupabase.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: null,
			});

			const routes = [
				{ path: '/login', element: <div data-testid="login-page">Login</div> },
				{
					path: '/host/dashboard',
					element: (
						<ProtectedRoute allowedRoles={['host']}>
							<div />
						</ProtectedRoute>
					),
				},
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/host/dashboard'] });

			await waitFor(() => {
				expect(screen.getByTestId('login-page')).toBeInTheDocument();
			});
		});

		it('redirects to /error/403 when role is not allowed', async () => {
			setMockUserRole('cleaner');

			const routes = [
				{ path: '/error/403', element: <div data-testid="forbidden">403</div> },
				{
					path: '/host/dashboard',
					element: (
						<ProtectedRoute allowedRoles={['host']}>
							<div data-testid="dashboard" />
						</ProtectedRoute>
					),
				},
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/host/dashboard'] });

			await waitFor(() => {
				expect(screen.getByTestId('forbidden')).toBeInTheDocument();
			});
		});

		it('renders children when role matches allowedRoles', async () => {
			setMockUserRole('host');

			const routes = [
				{
					path: '/host/dashboard',
					element: (
						<ProtectedRoute allowedRoles={['host']}>
							<div data-testid="host-dashboard">Host Dashboard</div>
						</ProtectedRoute>
					),
				},
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/host/dashboard'] });

			expect(await screen.findByTestId('host-dashboard')).toBeInTheDocument();
		});

		it('renders outlet when role matches and no children provided', async () => {
			setMockUserRole('admin');

			const routes = [
				{
					path: '/admin',
					element: <ProtectedRoute allowedRoles={['admin']} />,
					children: [{ index: true, element: <div data-testid="admin-page">Admin</div> }],
				},
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/admin'] });

			expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
		});
	});

	describe('PublicRoute', () => {
		it('redirects authenticated users to dashboard', async () => {
			setMockUserRole('host');

			const routes = [
				{
					path: '/login',
					element: (
						<PublicRoute>
							<div data-testid="login-form">Login</div>
						</PublicRoute>
					),
				},
				{ path: '/dashboard', element: <div data-testid="dashboard-redirect" /> },
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/login'] });

			await waitFor(() => {
				expect(screen.getByTestId('dashboard-redirect')).toBeInTheDocument();
			});
		});

		it('renders outlet for unauthenticated users', async () => {
			mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
			mockSupabase.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: null,
			});

			const routes = [
				{
					path: '/login',
					element: <PublicRoute />,
					children: [{ index: true, element: <div data-testid="login-form">Login</div> }],
				},
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/login'] });

			expect(await screen.findByTestId('login-form')).toBeInTheDocument();
		});
	});

	describe('DashboardRedirect', () => {
		it('redirects host to /host/dashboard', async () => {
			setMockUserRole('host');

			const { DashboardRedirect } = await import('@/features/auth/RouteGuards');

			const routes = [
				{ path: '/dashboard', element: <DashboardRedirect /> },
				{ path: '/host/dashboard', element: <div data-testid="host-page" /> },
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/dashboard'] });

			await waitFor(() => {
				expect(screen.getByTestId('host-page')).toBeInTheDocument();
			});
		});

		it('redirects cleaner to /cleaner/dashboard', async () => {
			setMockUserRole('cleaner');

			const { DashboardRedirect } = await import('@/features/auth/RouteGuards');

			const routes = [
				{ path: '/dashboard', element: <DashboardRedirect /> },
				{ path: '/cleaner/dashboard', element: <div data-testid="cleaner-page" /> },
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/dashboard'] });

			await waitFor(() => {
				expect(screen.getByTestId('cleaner-page')).toBeInTheDocument();
			});
		});

		it('redirects admin to /admin/dashboard', async () => {
			setMockUserRole('admin');

			const { DashboardRedirect } = await import('@/features/auth/RouteGuards');

			const routes = [
				{ path: '/dashboard', element: <DashboardRedirect /> },
				{ path: '/admin/dashboard', element: <div data-testid="admin-page" /> },
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/dashboard'] });

			await waitFor(() => {
				expect(screen.getByTestId('admin-page')).toBeInTheDocument();
			});
		});

		it('redirects unauthenticated users to login', async () => {
			mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
			mockSupabase.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: null,
			});

			const { DashboardRedirect } = await import('@/features/auth/RouteGuards');

			const routes = [
				{ path: '/dashboard', element: <DashboardRedirect /> },
				{ path: '/login', element: <div data-testid="login-page">Login</div> },
			];

			renderWithProviders(<div />, { routes, initialEntries: ['/dashboard'] });

			await waitFor(() => {
				expect(screen.getByTestId('login-page')).toBeInTheDocument();
			});
		});
	});
});
