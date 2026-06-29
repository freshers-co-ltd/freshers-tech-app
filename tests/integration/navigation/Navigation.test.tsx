import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Navigation } from '@/components/Navigation';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

describe('Navigation', () => {
	afterEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	it('shows host navigation links', async () => {
		setMockUserRole('host');

		renderWithProviders(<Navigation />, {
			routes: [{ path: '/host/dashboard', element: <Navigation /> }],
			initialEntries: ['/host/dashboard'],
		});

		await screen.findByRole('link', { name: /properties/i });
		expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /cleanings/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /properties/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
	});

	it('shows cleaner navigation links (no properties)', async () => {
		setMockUserRole('cleaner');

		renderWithProviders(<Navigation />, {
			routes: [{ path: '/cleaner/dashboard', element: <Navigation /> }],
			initialEntries: ['/cleaner/dashboard'],
		});

		await waitFor(() => {
			expect(screen.queryByRole('link', { name: /properties/i })).not.toBeInTheDocument();
		});

		expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /cleanings/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
	});

	it('shows admin navigation links', async () => {
		setMockUserRole('admin');

		renderWithProviders(<Navigation />, {
			routes: [{ path: '/admin/dashboard', element: <Navigation /> }],
			initialEntries: ['/admin/dashboard'],
		});

		await screen.findByRole('link', { name: /users/i });
		expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /cleanings/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
	});
});
