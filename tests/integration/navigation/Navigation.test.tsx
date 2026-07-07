import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Navigation } from '@/components/Navigation';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

describe('Navigation', () => {
	afterEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	const getDesktopNav = () => screen.getByRole('navigation', { name: /desktop navigation/i });

	it('shows host navigation links', async () => {
		setMockUserRole('host');

		renderWithProviders(<Navigation />, {
			routes: [{ path: '/host/dashboard', element: <Navigation /> }],
			initialEntries: ['/host/dashboard'],
		});

		const desktopNav = getDesktopNav();
		await within(desktopNav).findByRole('link', { name: /properties/i });
		expect(within(desktopNav).getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /cleanings/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /properties/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /account/i })).toBeInTheDocument();
	});

	it('shows cleaner navigation links (no properties)', async () => {
		setMockUserRole('cleaner');

		renderWithProviders(<Navigation />, {
			routes: [{ path: '/cleaner/dashboard', element: <Navigation /> }],
			initialEntries: ['/cleaner/dashboard'],
		});

		const desktopNav = getDesktopNav();
		await waitFor(() => {
			expect(
				within(desktopNav).queryByRole('link', { name: /properties/i }),
			).not.toBeInTheDocument();
		});
		expect(within(desktopNav).getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /cleanings/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /account/i })).toBeInTheDocument();
	});

	it('shows admin navigation links', async () => {
		setMockUserRole('admin');

		renderWithProviders(<Navigation />, {
			routes: [{ path: '/admin/dashboard', element: <Navigation /> }],
			initialEntries: ['/admin/dashboard'],
		});

		const desktopNav = getDesktopNav();
		await within(desktopNav).findByRole('link', { name: /users/i });
		expect(within(desktopNav).getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /users/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /cleanings/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /analytics/i })).toBeInTheDocument();
		expect(within(desktopNav).getByRole('link', { name: /account/i })).toBeInTheDocument();
	});
});
