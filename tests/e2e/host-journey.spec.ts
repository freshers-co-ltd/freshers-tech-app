import { expect, test } from '@playwright/test';
import { DICT, MOCK_CREDENTIALS } from './constants';
import {
	buildUser,
	clickNavLink,
	expectDialogWithTitle,
	expectOnDashboard,
	expectToast,
	setupHostMocks,
	setupSupabaseMocks,
} from './helpers';

test.describe('Host journey', () => {
	test.describe('Signup flow', () => {
		test('signs up as a host with email confirmation', async ({ page }) => {
			const user = buildUser('host');
			await setupSupabaseMocks(page, { user });

			await page.goto('/signup');

			await expect(page.getByRole('heading', { name: DICT.AUTH.SIGNUP.TITLE })).toBeVisible();
			await expect(page.getByText(DICT.AUTH.SIGNUP.MESSAGE)).toBeVisible();

			const hostCard = page.getByRole('button', { name: DICT.AUTH.SIGNUP.ROLES.HOST.BUTTON_TITLE });
			await hostCard.click();

			await expect(
				page.getByRole('heading', { name: DICT.AUTH.SIGNUP.ROLES.HOST.TITLE_FORM }),
			).toBeVisible();

			await page.fill('#name', 'Alice Host');
			await page.fill('#email', MOCK_CREDENTIALS.HOST.email);
			await page.fill('#password', MOCK_CREDENTIALS.HOST.password);
			await page.fill('#confirm-password', MOCK_CREDENTIALS.HOST.password);

			await page.getByRole('button', { name: DICT.AUTH.SIGNUP.BUTTON_SUBMIT }).click();

			await expectToast(page, DICT.AUTH.SIGNUP.VERIFICATION.TOAST_SUCCESS);
			await expect(
				page.getByRole('heading', { name: DICT.AUTH.SIGNUP.VERIFICATION.TITLE }),
			).toBeVisible();
			await expect(page.getByText(DICT.AUTH.SIGNUP.VERIFICATION.MESSAGE)).toBeVisible();

			await expect(page.locator('[data-slot="input-otp-slot"]').first()).toBeVisible();
		});
	});

	test.describe('Authenticated flows', () => {
		test.beforeEach(async ({ page }) => {
			await setupHostMocks(page);
			await page.goto('/host/dashboard');
		});

		test('shows dashboard with stats', async ({ page }) => {
			await expectOnDashboard(page, 'host');

			await expect(page.getByText(DICT.DASHBOARD.HOST.STATS.CONFIRMED)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.HOST.STATS.IN_PROGRESS)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.HOST.STATS.REQUESTED)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.HOST.STATS.PROPERTIES)).toBeVisible();
		});

		test('navigates to properties page and views property', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.PROPERTIES);

			await expect(page).toHaveURL(/\/host\/properties/);
			await expect(
				page.getByRole('heading', { name: DICT.PROPERTIES.TITLE }).first(),
			).toBeVisible();

			await expect(page.getByText('123 Test Street').first()).toBeVisible();
		});

		test('creates a new property', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.PROPERTIES);

			await page.getByRole('button', { name: DICT.PROPERTIES.NEW }).click();

			await expectDialogWithTitle(page, DICT.PROPERTIES.CREATE.TITLE);

			await page.fill('#address_line_1', '789 New Street');
			await page.fill('#town_city', 'Manchester');
			await page.fill('#postcode', 'M1 1AA');
			await page.fill('#bedrooms', '3');
			await page.fill('#bathrooms', '2');

			await page.getByRole('button', { name: DICT.PROPERTIES.FORM.BUTTON_SUBMIT }).click();

			await expectToast(page, DICT.PROPERTIES.CREATE.TOAST);

			await expect(page.getByText('789 New Street')).toBeVisible();
		});

		test('edits an existing property', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.PROPERTIES);

			await page.getByText('123 Test Street').first().click();

			await page.getByRole('button', { name: DICT.COMMON.ACTIONS.EDIT }).click();

			await expectDialogWithTitle(page, DICT.PROPERTIES.EDIT.TITLE);

			await page.fill('#address_line_1', '123 Updated Street');

			await page.getByRole('button', { name: DICT.PROPERTIES.FORM.BUTTON_UPDATE }).click();

			await expectToast(page, DICT.PROPERTIES.EDIT.TOAST);

			await expect(page.getByText('123 Updated Street')).toBeVisible();
		});

		test('deletes a property', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.PROPERTIES);

			await page.getByText('123 Test Street').first().click();

			await page.getByRole('button', { name: DICT.COMMON.ACTIONS.DELETE }).click();

			await expectDialogWithTitle(page, DICT.PROPERTIES.DELETE.TITLE);
			await page
				.locator('[role="alertdialog"]')
				.getByRole('button', { name: DICT.COMMON.ACTIONS.DELETE })
				.click();

			await expectToast(page, DICT.PROPERTIES.DELETE.TOAST);

			await expect(page.getByText('123 Test Street')).not.toBeVisible();
		});

		test('navigates to cleanings page', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await expect(page).toHaveURL(/\/host\/cleanings/);
			await expect(page.getByRole('heading', { name: DICT.CLEANINGS.TITLE })).toBeVisible();

			await expect(page.getByText(DICT.CLEANINGS.NEW)).toBeVisible();
		});

		test('views cleaning details and cancels the cleaning request', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await page.getByText('123 Test Street').first().click();

			await expect(page.getByText('123 Test Street').first()).toBeVisible();

			const cancelButton = page.getByRole('button', { name: DICT.COMMON.ACTIONS.DELETE });
			await cancelButton.click();

			await expectDialogWithTitle(page, DICT.CLEANINGS.DELETE.TITLE);
			await page.getByRole('button', { name: DICT.COMMON.ACTIONS.DELETE }).click();

			await expectToast(page, DICT.CLEANINGS.DELETE.TOAST);

			await expect(page.getByRole('heading', { name: DICT.CLEANINGS.TITLE })).toBeVisible();
		});

		test('signs out', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.ACCOUNT);

			await expect(page).toHaveURL(/\/host\/account/);
			await expect(page.getByRole('heading', { name: DICT.ACCOUNT.TITLE })).toBeVisible();

			await page.getByRole('button', { name: DICT.ACCOUNT.BUTTON_SIGN_OUT }).click();

			await expect(page).toHaveURL(/\/login/);
			await expect(page.getByRole('heading', { name: DICT.AUTH.LOGIN.TITLE })).toBeVisible();
		});
	});
});
