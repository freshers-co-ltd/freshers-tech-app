import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuthContextType, useAuth } from '@/features/auth/AuthContext';
import { DashboardRedirect, PublicRoute } from '@/features/auth/RouteGuards';

vi.mock('@/features/auth/AuthContext', () => ({
	useAuth: vi.fn(),
}));

describe('Authentication Routing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('blocks authenticated users from public routes', () => {
		vi.mocked(useAuth).mockReturnValue({
			user: { id: '123' },
			profile: { role: 'host' },
			loading: false,
		} as Partial<AuthContextType> as AuthContextType);

		render(
			<MemoryRouter initialEntries={['/login']}>
				<Routes>
					<Route element={<PublicRoute />}>
						<Route path="/login" element={<div>Login</div>} />
					</Route>
					<Route path="/dashboard" element={<div data-testid="dashboard-redirect" />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('dashboard-redirect')).toBeInTheDocument();
	});

	it('shows loading state during session verification', () => {
		vi.mocked(useAuth).mockReturnValue({
			loading: true,
			user: null,
			profile: null,
		} as Partial<AuthContextType> as AuthContextType);

		render(
			<MemoryRouter initialEntries={['/dashboard']}>
				<DashboardRedirect />
			</MemoryRouter>,
		);

		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	it.each([
		['host', '/host/dashboard'],
		['cleaner', '/cleaner/dashboard'],
		['admin', '/admin/dashboard'],
	] as const)('routes %s role to %s', (role, expectedPath) => {
		vi.mocked(useAuth).mockReturnValue({
			user: { id: '123' },
			profile: { role },
			loading: false,
		} as Partial<AuthContextType> as AuthContextType);

		render(
			<MemoryRouter initialEntries={['/dashboard']}>
				<Routes>
					<Route path="/dashboard" element={<DashboardRedirect />} />
					<Route path={expectedPath} element={<div data-testid={`page-${role}`} />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByTestId(`page-${role}`)).toBeInTheDocument();
	});

	it('redirects unauthenticated users to login', () => {
		vi.mocked(useAuth).mockReturnValue({
			user: null,
			loading: false,
		} as Partial<AuthContextType> as AuthContextType);

		render(
			<MemoryRouter initialEntries={['/dashboard']}>
				<Routes>
					<Route path="/dashboard" element={<DashboardRedirect />} />
					<Route path="/login" element={<div data-testid="login-page" />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('login-page')).toBeInTheDocument();
	});
});
