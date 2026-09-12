import { expect, test } from '@playwright/test';
import { DICT } from './constants';
import {
	buildProperty,
	buildSubscription,
	buildUser,
	expectOnDashboard,
	seedAuthSession,
	setupCleanerMocks,
	setupHostMocks,
	setupSupabaseMocks,
} from './helpers';

test.describe('Subscription journey', () => {
	test.describe('Subscription gate', () => {
		test('non-subscribed host is redirected to pending from dashboard', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/dashboard');
			await expect(page).toHaveURL(/\/host\/subscription\/pending/);
		});

		test('non-subscribed host is redirected to pending from properties', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/properties');
			await expect(page).toHaveURL(/\/host\/subscription\/pending/);
		});

		test('non-subscribed host is redirected to pending from cleanings', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/cleanings');
			await expect(page).toHaveURL(/\/host\/subscription\/pending/);
		});

		test('invited host bypasses subscription gate and sees dashboard', async ({ page }) => {
			const user = buildUser('host', {
				is_invited: true,
				host_subscription_status: null,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/dashboard');
			await expectOnDashboard(page, 'host');
		});

		test('active subscriber host sees dashboard normally', async ({ page }) => {
			await setupHostMocks(page);
			await page.goto('/host/dashboard');
			await expectOnDashboard(page, 'host');
		});

		test('cleaner routes have no subscription gate', async ({ page }) => {
			await setupCleanerMocks(page);
			await page.goto('/cleaner/dashboard');
			await expectOnDashboard(page, 'cleaner');
		});
	});

	test.describe('Subscription pending page', () => {
		test('shows subscription pricing and subscribe button', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/pending');

			await expect(
				page.getByRole('heading', { name: DICT.SUBSCRIPTION.PENDING.TITLE }),
			).toBeVisible();
			await expect(
				page.getByText(
					'Subscribe for £29.00/month to access the platform. Click below to get redirected to Stripe for payment.',
				),
			).toBeVisible();
			await expect(
				page.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }),
			).toBeVisible();
		});

		test('subscribe button calls stripe-billing checkout endpoint', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/pending');

			const checkoutRequest = page.waitForRequest(
				(req) =>
					req.url().includes('/functions/v1/stripe-billing/checkout') && req.method() === 'POST',
			);

			await page.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }).click();

			const request = await checkoutRequest;
			expect(request).toBeTruthy();
		});

		test('subscribe button shows processing state', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.route(/\/functions\/v1\/stripe-billing\/checkout/, async (route) => {
				await new Promise((r) => setTimeout(r, 1000));
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ url: 'https://checkout.stripe.com/mock-session-id' }),
				});
			});
			await page.goto('/host/subscription/pending');

			await page.getByRole('button', { name: DICT.SUBSCRIPTION.PENDING.BUTTON_SUBSCRIBE }).click();

			await expect(page.getByRole('button', { name: DICT.SUBSCRIPTION.PROCESSING })).toBeVisible();
		});

		test('redirects to dashboard if profile becomes active', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: 'active',
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});

			await page.goto('/host/subscription/pending');
			await expect(page).toHaveURL(/\/host\/dashboard/, { timeout: 10000 });
		});

		test('non-host user accessing pending page gets 403', async ({ page }) => {
			const cleaner = buildUser('cleaner');
			await seedAuthSession(page, cleaner);
			await setupSupabaseMocks(page, { user: cleaner });
			await page.goto('/host/subscription/pending');
			await expect(page).toHaveURL(/\/error\/403/);
		});
	});

	test.describe('Subscription success page', () => {
		test('verifies session and shows activated state', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/success?session_id=mock_session_123');

			await expect(page.getByText(DICT.SUBSCRIPTION.SUCCESS.TITLE)).toBeVisible({ timeout: 10000 });
			await expect(page.getByText(DICT.SUBSCRIPTION.SUCCESS.MESSAGE)).toBeVisible();
			await expect(
				page.getByRole('link', { name: DICT.SUBSCRIPTION.SUCCESS.BUTTON_DASHBOARD }),
			).toBeVisible();
		});

		test('shows verifying spinner while processing', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.route(/\/functions\/v1\/stripe-billing\/verify/, async (route) => {
				await new Promise((r) => setTimeout(r, 2000));
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ status: 'active' }),
				});
			});
			await page.goto('/host/subscription/success?session_id=mock_session_123');

			await expect(page.getByText('Verifying your subscription...')).toBeVisible({ timeout: 5000 });
		});

		test('shows error when no session_id provided', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/success');

			await expect(page.getByText('Verification Failed')).toBeVisible({ timeout: 10000 });
			await expect(page.getByText('No session ID found')).toBeVisible();
		});

		test('shows error when verification fails', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.route(/\/functions\/v1\/stripe-billing\/verify/, async (route) => {
				await route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Payment not completed' }),
				});
			});

			await page.goto('/host/subscription/success?session_id=mock_session_123');

			await expect(page.getByText('Verification Failed')).toBeVisible({ timeout: 10000 });
			await expect(page.getByText('Payment not completed')).toBeVisible();
			await expect(page.getByRole('link', { name: 'Try Again' })).toBeVisible();
		});
	});

	test.describe('Subscription canceled page', () => {
		test('shows canceled page with retry and support buttons', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/canceled');

			await expect(
				page.getByRole('heading', { name: DICT.SUBSCRIPTION.CANCELED.TITLE }),
			).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.CANCELED.MESSAGE)).toBeVisible();
			await expect(
				page.getByRole('button', { name: DICT.SUBSCRIPTION.CANCELED.BUTTON_RETRY }),
			).toBeVisible();
			await expect(
				page.getByRole('link', { name: DICT.SUBSCRIPTION.CANCELED.BUTTON_SUPPORT }),
			).toBeVisible();
		});

		test('try again button calls stripe-billing checkout', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/canceled');

			const checkoutRequest = page.waitForRequest(
				(req) =>
					req.url().includes('/functions/v1/stripe-billing/checkout') && req.method() === 'POST',
			);

			await page.getByRole('button', { name: DICT.SUBSCRIPTION.CANCELED.BUTTON_RETRY }).click();

			const request = await checkoutRequest;
			expect(request).toBeTruthy();
		});

		test('contact support button links to mailto', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: null,
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});
			await page.goto('/host/subscription/canceled');

			const supportLink = page.getByRole('link', {
				name: DICT.SUBSCRIPTION.CANCELED.BUTTON_SUPPORT,
			});
			await expect(supportLink).toHaveAttribute('href', 'mailto:contact@freshersco.com');
		});
	});

	test.describe('Account billing section', () => {
		test('shows billing nav link and section for non-invited host', async ({ page }) => {
			await setupHostMocks(page);
			await page.goto('/host/account');

			await expect(page.getByRole('heading', { name: DICT.ACCOUNT.TITLE })).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.SECTION_TITLE).first()).toBeVisible();
		});

		test('hides billing section for invited host', async ({ page }) => {
			const user = buildUser('host', {
				is_invited: true,
				host_subscription_status: null,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});

			await page.goto('/host/account');

			await expect(page.getByRole('heading', { name: DICT.ACCOUNT.TITLE })).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.SECTION_TITLE)).not.toBeVisible();
		});

		test('hides billing section for cleaner', async ({ page }) => {
			await setupCleanerMocks(page);
			await page.goto('/cleaner/account');

			await expect(page.getByRole('heading', { name: DICT.ACCOUNT.TITLE })).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.SECTION_TITLE)).not.toBeVisible();
		});

		test('shows ACTIVE badge and manage billing button for active subscription', async ({
			page,
		}) => {
			const user = buildUser('host', {
				host_subscription_status: 'active',
				is_invited: false,
			});
			const subscriptions = [buildSubscription({ status: 'active' })];
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
				subscriptions,
			});

			await page.goto('/host/account');

			await expect(page.getByText(DICT.SUBSCRIPTION.SECTION_TITLE).first()).toBeVisible();
			await expect(
				page.locator('[data-slot="badge"]').filter({ hasText: DICT.SUBSCRIPTION.STATUS_ACTIVE }),
			).toBeVisible();
			await expect(page.getByRole('button', { name: DICT.SUBSCRIPTION.MANAGE })).toBeVisible();
		});

		test('shows PAYMENT ISSUE badge for past_due status', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: 'past_due',
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});

			await page.goto('/host/account');

			await expect(page.getByText(DICT.SUBSCRIPTION.SECTION_TITLE).first()).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.STATUS_PAYMENT_ISSUE)).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.PAYMENT_FAILED.MESSAGE)).toBeVisible();
			await expect(
				page.getByRole('button', { name: DICT.SUBSCRIPTION.PAYMENT_FAILED.BUTTON_UPDATE }),
			).toBeVisible();
		});

		test('shows INACTIVE badge and resubscribe button for canceled status', async ({ page }) => {
			const user = buildUser('host', {
				host_subscription_status: 'canceled',
				is_invited: false,
			});
			await seedAuthSession(page, user);
			await setupSupabaseMocks(page, {
				user,
				properties: [buildProperty()],
				cleanings: [],
			});

			await page.goto('/host/account');

			await expect(page.getByText(DICT.SUBSCRIPTION.SECTION_TITLE).first()).toBeVisible();
			await expect(page.getByText(DICT.SUBSCRIPTION.STATUS_INACTIVE)).toBeVisible();
			await expect(page.getByRole('button', { name: DICT.SUBSCRIPTION.RESUBSCRIBE })).toBeVisible();
		});
	});

	test.describe('Admin subscription visibility', () => {
		test('admin host detail shows subscription status for paying host', async ({ page }) => {
			const adminUser = buildUser('admin');
			const hostUser = buildUser('host', {
				host_subscription_status: 'active',
				is_invited: false,
			});
			await seedAuthSession(page, adminUser);
			await setupSupabaseMocks(
				page,
				{
					user: adminUser,
					properties: [buildProperty()],
					cleanings: [],
					users: [hostUser],
					subscriptions: [buildSubscription({ host_id: hostUser.id })],
				},
				{ isAdmin: true },
			);

			await page.goto(`/admin/users/hosts/${hostUser.id}`);

			await expect(page.getByText(hostUser.full_name).first()).toBeVisible({ timeout: 10000 });
			await expect(page.getByText(DICT.SUBSCRIPTION.STATUS_ACTIVE)).toBeVisible();
		});

		test('admin host detail shows free access for invited host', async ({ page }) => {
			const adminUser = buildUser('admin');
			const invitedHost = buildUser('host', {
				is_invited: true,
				host_subscription_status: null,
			});
			await seedAuthSession(page, adminUser);
			await setupSupabaseMocks(
				page,
				{
					user: adminUser,
					properties: [],
					cleanings: [],
					users: [invitedHost],
				},
				{ isAdmin: true },
			);

			await page.goto(`/admin/users/hosts/${invitedHost.id}`);

			await expect(page.getByText(invitedHost.full_name).first()).toBeVisible({ timeout: 10000 });
			await expect(page.getByText(DICT.ADMIN.USERS.DETAIL.INVITED_HOST)).toBeVisible();
		});
	});
});
