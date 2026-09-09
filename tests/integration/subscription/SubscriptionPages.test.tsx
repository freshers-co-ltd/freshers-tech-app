import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DICT } from '@/dictionary';
import { profileService } from '@/features/auth/services/profileService';
import type { Profile } from '@/features/auth/types';
import { subscriptionService } from '@/features/subscription/services/subscriptionService';
import { SubscriptionCanceledPage } from '@/pages/host/SubscriptionCanceled';
import { SubscriptionPendingPage } from '@/pages/host/SubscriptionPending';
import { SubscriptionSuccessPage } from '@/pages/host/SubscriptionSuccess';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

describe('Subscription Pages', () => {
	let locationAssign: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		locationAssign = vi.fn();
		vi.spyOn(window, 'location', 'get').mockReturnValue({
			href: '',
			assign: locationAssign as unknown as (url: string | URL) => void,
			replace: vi.fn() as unknown as (url: string | URL) => void,
			reload: vi.fn() as unknown as () => void,
			toString: vi.fn().mockReturnValue('http://localhost:5173'),
			origin: 'http://localhost:5173',
			protocol: 'http:',
			host: 'localhost:5173',
			hostname: 'localhost',
			port: '5173',
			pathname: '/',
			search: '',
			hash: '',
			ancestorOrigins: {
				length: 0,
				item: () => null,
				contains: () => false,
			} as unknown as DOMStringList,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	describe('SubscriptionPendingPage', () => {
		const renderPendingPage = (profile: Profile) => {
			vi.spyOn(profileService, 'getProfileWithFallback').mockResolvedValue({
				data: profile,
				error: null,
			});
			vi.spyOn(subscriptionService, 'getPricing').mockResolvedValue({
				data: { amount: 2900, currency: 'gbp', interval: 'month' },
				error: null,
			});

			return renderWithProviders(<SubscriptionPendingPage />, {
				routes: [
					{ path: '/host/subscription/pending', element: <SubscriptionPendingPage /> },
					{ path: '/host/dashboard', element: <div data-testid="dashboard">Dashboard</div> },
				],
				initialEntries: ['/host/subscription/pending'],
			});
		};

		it('shows subscribe button for non-invited host', async () => {
			setMockUserRole('host');
			renderPendingPage({
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: false,
				host_subscription_status: null,
			});

			expect(
				await screen.findByRole('heading', { name: DICT.SUBSCRIPTION.PENDING.TITLE }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }),
			).toBeInTheDocument();
		});

		it('redirects invited host to dashboard via window.location', async () => {
			setMockUserRole('host');
			renderPendingPage({
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: true,
				host_subscription_status: null,
			});

			await waitFor(() => {
				expect(window.location.href).toBe('/host/dashboard');
			});
		});

		it('does not show subscribe button for active subscription', async () => {
			setMockUserRole('host');
			renderPendingPage({
				id: 'user_123',
				email: 'test@example.com',
				role: 'host',
				full_name: 'Test User',
				avatar_url: null,
				is_verified: false,
				is_invited: false,
				host_subscription_status: 'active',
			});

			await waitFor(() => {
				expect(window.location.href).toBe('/host/dashboard');
			});
		});
	});

	describe('SubscriptionSuccessPage', () => {
		it('shows success message after verification', async () => {
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
			vi.spyOn(subscriptionService, 'verifyCheckoutSession').mockResolvedValue({
				data: { status: 'complete' },
				error: null,
			});

			renderWithProviders(<SubscriptionSuccessPage />, {
				routes: [{ path: '/host/subscription/success', element: <SubscriptionSuccessPage /> }],
				initialEntries: ['/host/subscription/success?session_id=cs_test_123'],
			});

			await waitFor(() => {
				expect(
					screen.getByRole('heading', { name: DICT.SUBSCRIPTION.SUCCESS.TITLE }),
				).toBeInTheDocument();
				expect(screen.getByText(DICT.SUBSCRIPTION.SUCCESS.MESSAGE)).toBeInTheDocument();
				expect(
					screen.getByRole('link', { name: DICT.SUBSCRIPTION.SUCCESS.BUTTON_DASHBOARD }),
				).toBeInTheDocument();
			});
		});

		it('shows error when no session_id is provided', async () => {
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
			vi.spyOn(subscriptionService, 'verifyCheckoutSession').mockResolvedValue({
				data: null,
				error: null,
			});

			renderWithProviders(<SubscriptionSuccessPage />, {
				routes: [{ path: '/host/subscription/success', element: <SubscriptionSuccessPage /> }],
				initialEntries: ['/host/subscription/success'],
			});

			await waitFor(() => {
				expect(screen.getByText('Verification Failed')).toBeInTheDocument();
				expect(screen.getByText('No session ID found')).toBeInTheDocument();
			});
		});

		it('shows error when verification fails', async () => {
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
			vi.spyOn(subscriptionService, 'verifyCheckoutSession').mockResolvedValue({
				data: null,
				error: 'Invalid session',
			});

			renderWithProviders(<SubscriptionSuccessPage />, {
				routes: [{ path: '/host/subscription/success', element: <SubscriptionSuccessPage /> }],
				initialEntries: ['/host/subscription/success?session_id=cs_bad_123'],
			});

			await waitFor(() => {
				expect(screen.getByText('Verification Failed')).toBeInTheDocument();
				expect(screen.getByText('Invalid session')).toBeInTheDocument();
			});
		});
	});

	describe('SubscriptionCanceledPage', () => {
		it('shows canceled message with retry and support buttons', () => {
			renderWithProviders(<SubscriptionCanceledPage />, {
				routes: [
					{
						path: '/host/subscription/canceled',
						element: <SubscriptionCanceledPage />,
					},
				],
				initialEntries: ['/host/subscription/canceled'],
			});

			expect(
				screen.getByRole('heading', { name: DICT.SUBSCRIPTION.CANCELED.TITLE }),
			).toBeInTheDocument();
			expect(screen.getByText(DICT.SUBSCRIPTION.CANCELED.MESSAGE)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: DICT.SUBSCRIPTION.CANCELED.BUTTON_RETRY }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('link', { name: DICT.SUBSCRIPTION.CANCELED.BUTTON_SUPPORT }),
			).toHaveAttribute('href', 'mailto:contact@freshersco.com');
		});

		it('retry button triggers checkout session', async () => {
			const user = userEvent.setup();
			const createCheckoutSpy = vi
				.spyOn(subscriptionService, 'createCheckoutSession')
				.mockResolvedValue({ data: 'https://checkout.stripe.com/test', error: null });

			renderWithProviders(<SubscriptionCanceledPage />, {
				routes: [
					{
						path: '/host/subscription/canceled',
						element: <SubscriptionCanceledPage />,
					},
				],
				initialEntries: ['/host/subscription/canceled'],
			});

			await user.click(
				screen.getByRole('button', { name: DICT.SUBSCRIPTION.CANCELED.BUTTON_RETRY }),
			);

			await waitFor(() => {
				expect(createCheckoutSpy).toHaveBeenCalled();
			});
		});
	});
});
