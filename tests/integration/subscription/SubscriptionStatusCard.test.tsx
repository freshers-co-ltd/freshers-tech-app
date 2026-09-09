import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DICT } from '@/dictionary';
import { SubscriptionStatusCard } from '@/features/subscription/components/SubscriptionStatusCard';
import { subscriptionService } from '@/features/subscription/services/subscriptionService';
import { buildProfile } from '~/factories/profile';
import { renderWithProviders } from '~/utils';

describe('SubscriptionStatusCard', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const renderCard = (profileOverrides?: Parameters<typeof buildProfile>[0]) => {
		const profile = buildProfile(profileOverrides);
		return renderWithProviders(<SubscriptionStatusCard profile={profile} />, {
			routes: [
				{
					path: '/host/account',
					element: <SubscriptionStatusCard profile={profile} />,
				},
			],
			initialEntries: ['/host/account'],
		});
	};

	it('shows active status with manage billing button', async () => {
		vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
			data: {
				status: 'active',
				current_period_end: '2026-10-08T00:00:00Z',
				cancel_at: null,
			},
			error: null,
		});

		renderCard({ host_subscription_status: 'active' });

		expect(screen.getAllByText(DICT.SUBSCRIPTION.STATUS_ACTIVE).length).toBeGreaterThanOrEqual(1);
		expect(screen.getByRole('button', { name: DICT.SUBSCRIPTION.MANAGE })).toBeInTheDocument();
	});

	it('shows renewal date when active', async () => {
		vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
			data: {
				status: 'active',
				current_period_end: '2026-10-08T00:00:00Z',
				cancel_at: null,
			},
			error: null,
		});

		renderCard({ host_subscription_status: 'active' });

		await waitFor(() => {
			expect(screen.getByText(DICT.SUBSCRIPTION.RENEWAL_DATE)).toBeInTheDocument();
		});
	});

	it('shows payment failed warning for past_due status', () => {
		renderCard({ host_subscription_status: 'past_due' });

		expect(screen.getByText(DICT.SUBSCRIPTION.PAYMENT_FAILED.MESSAGE)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: DICT.SUBSCRIPTION.PAYMENT_FAILED.BUTTON_UPDATE }),
		).toBeInTheDocument();
	});

	it('shows payment failed warning for unpaid status', () => {
		renderCard({ host_subscription_status: 'unpaid' });

		expect(screen.getByText(DICT.SUBSCRIPTION.PAYMENT_FAILED.MESSAGE)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: DICT.SUBSCRIPTION.PAYMENT_FAILED.BUTTON_UPDATE }),
		).toBeInTheDocument();
	});

	it('shows subscribe button for incomplete status', () => {
		renderCard({ host_subscription_status: 'incomplete' });

		expect(
			screen.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }),
		).toBeInTheDocument();
	});

	it('shows resubscribe button for canceled status', () => {
		renderCard({ host_subscription_status: 'canceled' });

		expect(screen.getByRole('button', { name: DICT.SUBSCRIPTION.RESUBSCRIBE })).toBeInTheDocument();
	});

	it('shows subscribe button for null status', () => {
		renderCard({ host_subscription_status: null });

		expect(
			screen.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }),
		).toBeInTheDocument();
	});

	it('checkout session redirects to Stripe URL', async () => {
		const user = userEvent.setup();
		vi.spyOn(subscriptionService, 'createCheckoutSession').mockResolvedValue({
			data: 'https://checkout.stripe.com/test',
			error: null,
		});

		renderCard({ host_subscription_status: 'incomplete' });

		await user.click(
			screen.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }),
		);

		await waitFor(() => {
			expect(subscriptionService.createCheckoutSession).toHaveBeenCalled();
		});
	});

	it('shows error toast when checkout fails', async () => {
		const user = userEvent.setup();
		vi.spyOn(subscriptionService, 'createCheckoutSession').mockResolvedValue({
			data: null,
			error: 'Session creation failed',
		});

		renderCard({ host_subscription_status: 'incomplete' });

		await user.click(
			screen.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }),
		);

		await waitFor(() => {
			expect(subscriptionService.createCheckoutSession).toHaveBeenCalled();
		});
	});

	it('portal session redirects to Stripe URL', async () => {
		const user = userEvent.setup();
		vi.spyOn(subscriptionService, 'createPortalSession').mockResolvedValue({
			data: 'https://billing.stripe.com/test',
			error: null,
		});
		vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
			data: {
				status: 'active',
				current_period_end: '2026-10-08T00:00:00Z',
				cancel_at: null,
			},
			error: null,
		});

		renderCard({ host_subscription_status: 'active' });

		await user.click(screen.getByRole('button', { name: DICT.SUBSCRIPTION.MANAGE }));

		await waitFor(() => {
			expect(subscriptionService.createPortalSession).toHaveBeenCalled();
		});
	});
});
