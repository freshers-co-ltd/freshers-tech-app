import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileService } from '@/features/auth/services/profileService';
import { SubscriptionGate } from '@/features/subscription/SubscriptionGate';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

describe('SubscriptionGate', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderGate = (
		_profileOverrides?: Parameters<typeof profileService.getProfileWithFallback>[0] extends string
			? never
			: never,
	) => {
		const spy = vi.spyOn(profileService, 'getProfileWithFallback');

		return {
			spy,
			...renderWithProviders(<div data-testid="protected-content">Protected Content</div>, {
				routes: [
					{
						path: '/host/dashboard',
						element: (
							<SubscriptionGate>
								<div data-testid="protected-content">Protected Content</div>
							</SubscriptionGate>
						),
					},
					{ path: '/login', element: <div data-testid="login-page">Login</div> },
					{
						path: '/host/subscription/pending',
						element: <div data-testid="pending-page">Pending</div>,
					},
				],
				initialEntries: ['/host/dashboard'],
			}),
		};
	};

	it('renders children when profile has active subscription', async () => {
		setMockUserRole('host');
		vi.spyOn(profileService, 'getProfileWithFallback').mockResolvedValue({
			data: {
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: false,
				host_subscription_status: 'active',
			},
			error: null,
		});

		renderGate();

		await waitFor(() => {
			expect(screen.queryByTestId('protected-content')).toBeInTheDocument();
		});
	});

	it('renders children when profile is invited host', async () => {
		setMockUserRole('host');
		vi.spyOn(profileService, 'getProfileWithFallback').mockResolvedValue({
			data: {
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: true,
				host_subscription_status: null,
			},
			error: null,
		});

		renderGate();

		await waitFor(() => {
			expect(screen.queryByTestId('protected-content')).toBeInTheDocument();
		});
	});

	it('renders children when profile is cleaner role', async () => {
		setMockUserRole('cleaner');
		vi.spyOn(profileService, 'getProfileWithFallback').mockResolvedValue({
			data: {
				id: 'user_123',
				email: 'test@example.com',
				role: 'cleaner',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: false,
				host_subscription_status: null,
			},
			error: null,
		});

		renderGate();

		await waitFor(() => {
			expect(screen.queryByTestId('protected-content')).toBeInTheDocument();
		});
	});

	it('redirects to pending page when host needs subscription', async () => {
		setMockUserRole('host');
		vi.spyOn(profileService, 'getProfileWithFallback').mockResolvedValue({
			data: {
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: false,
				host_subscription_status: null,
			},
			error: null,
		});

		renderGate();

		await waitFor(() => {
			expect(screen.queryByTestId('pending-page')).toBeInTheDocument();
		});
	});

	it('redirects to pending when host has incomplete status', async () => {
		setMockUserRole('host');
		vi.spyOn(profileService, 'getProfileWithFallback').mockResolvedValue({
			data: {
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: false,
				host_subscription_status: 'incomplete',
			},
			error: null,
		});

		renderGate();

		await waitFor(() => {
			expect(screen.queryByTestId('pending-page')).toBeInTheDocument();
		});
	});
});
