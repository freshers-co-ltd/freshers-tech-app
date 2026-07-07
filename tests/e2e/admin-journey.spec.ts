import { expect, test } from '@playwright/test';
import { DICT } from './constants';
import {
	clickNavLink,
	expectDialogWithTitle,
	expectOnDashboard,
	expectToast,
	setupAdminMocks,
} from './helpers';

test.describe('Admin journey', () => {
	test.describe('Authenticated flows', () => {
		test.beforeEach(async ({ page }) => {
			await setupAdminMocks(page);
			await page.goto('/admin/dashboard');
		});

		test('shows dashboard with stats', async ({ page }) => {
			await expectOnDashboard(page, 'admin');

			await expect(page.getByText(DICT.DASHBOARD.ADMIN.STATS.COMPLETED_THIS_MONTH)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.ADMIN.STATS.IN_PROGRESS)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.ADMIN.STATS.AVG_COMPLETION_TIME)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.ADMIN.STATS.TOTAL_PROPERTIES)).toBeVisible();
		});

		test('navigates to users page and sees user table', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.USERS);

			await expect(page).toHaveURL(/\/admin\/users/);
			await expect(page.getByRole('heading', { name: DICT.ADMIN.USERS.TITLE })).toBeVisible();

			await expect(page.getByText('Total Users')).toBeVisible();
			await expect(page.getByText('Online').first()).toBeVisible();

			await expect(page.getByRole('combobox').first()).toBeVisible();
		});

		test('filters users by role tab', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.USERS);

			await page.getByText(DICT.ADMIN.USERS.TABS.ALL).click();
			await page.getByRole('option', { name: DICT.ADMIN.USERS.TABS.CLEANERS }).click();

			const isMobile = test.info().project.name.includes('Mobile');
			if (isMobile) {
				await expect(page.getByText('Bob Cleaner').first()).toBeVisible();
			} else {
				await expect(page.getByRole('cell', { name: 'Bob Cleaner' })).toBeVisible();
			}
		});

		test('views host detail page', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.USERS);

			const isMobile = test.info().project.name.includes('Mobile');
			if (isMobile) {
				await page.getByRole('button', { name: 'View details' }).first().click();
			} else {
				const hostRow = page
					.getByRole('row')
					.filter({ hasText: /Alice Host/i })
					.first();
				await hostRow.getByRole('button', { name: 'View details' }).click();
			}

			await expect(page).toHaveURL(/\/admin\/users\/hosts\//);
			await expect(page.getByText('Alice Host').first()).toBeVisible();
		});

		test('views cleaner detail page', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.USERS);

			const isMobile = test.info().project.name.includes('Mobile');
			if (isMobile) {
				await page.getByRole('button', { name: 'View details' }).nth(1).click();
			} else {
				const cleanerRow = page
					.getByRole('row')
					.filter({ hasText: /Bob Cleaner/i })
					.first();
				await cleanerRow.getByRole('button', { name: 'View details' }).click();
			}

			await expect(page).toHaveURL(/\/admin\/users\/cleaners\//);
			await expect(page.getByText('Bob Cleaner').first()).toBeVisible();
		});

		test('navigates to cleanings page and assigns a cleaner', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await expect(page).toHaveURL(/\/admin\/cleanings/);
			await expect(page.getByRole('heading', { name: DICT.ADMIN.CLEANINGS.TITLE })).toBeVisible();

			const assignButton = page.getByRole('button', { name: DICT.COMMON.ACTIONS.ASSIGN }).first();
			await expect(assignButton).toBeVisible({ timeout: 10000 });
			await assignButton.click();

			await expectDialogWithTitle(page, DICT.CLEANINGS.ASSIGN_CLEANER.TITLE);

			const selectTrigger = page.getByRole('combobox', {
				name: DICT.CLEANINGS.ASSIGN_CLEANER.SELECT,
			});
			await selectTrigger.click();

			await page.getByRole('option', { name: 'Bob Cleaner' }).click();

			await page.getByRole('button', { name: DICT.COMMON.ACTIONS.ASSIGN_CLEANER }).click();

			await expectToast(page, DICT.CLEANINGS.ASSIGN_CLEANER.TOAST_SUCCESS);
		});

		test('opens pay rates dialog', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await page.getByRole('button', { name: DICT.ADMIN.CLEANINGS.BUTTONS.PAY_RATES }).click();

			await expect(page.getByText('Hourly Rate (£)')).toBeVisible({ timeout: 5000 });
		});

		test('opens standard tasks dialog', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await page.getByRole('button', { name: DICT.ADMIN.CLEANINGS.BUTTONS.STANDARD_TASKS }).click();

			await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 5000 });
			await expect(page.getByRole('textbox').nth(1)).toBeVisible();
		});

		test('invites a new user', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.USERS);

			await page.getByRole('button', { name: /Invite/i }).click();

			await expectDialogWithTitle(page, DICT.ADMIN.USERS.INVITE_USER.TITLE);

			await page.locator('#invite-email').fill('newuser@example.com');
			await page.locator('#invite-name').fill('New User');

			await page.getByRole('button', { name: DICT.ADMIN.USERS.INVITE_USER.BUTTON_SUBMIT }).click();

			await expectToast(page, DICT.TOASTS.INVITATION_SENT);
		});

		test('signs out', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.ACCOUNT);

			await expect(page).toHaveURL(/\/admin\/account/);
			await expect(page.getByRole('heading', { name: DICT.ACCOUNT.TITLE })).toBeVisible();

			await page.getByRole('button', { name: DICT.ACCOUNT.BUTTON_SIGN_OUT }).click();

			await expect(page).toHaveURL(/\/login/);
			await expect(page.getByRole('heading', { name: DICT.AUTH.LOGIN.TITLE })).toBeVisible();
		});
	});
});
