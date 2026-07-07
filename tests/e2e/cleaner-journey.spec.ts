import { expect, test } from '@playwright/test';
import { DICT, MOCK_UUIDS } from './constants';
import {
	buildCleaning,
	buildTask,
	buildUser,
	clickNavLink,
	expectOnDashboard,
	expectToast,
	type MockCleaning,
	type MockTask,
	setupCleanerMocks,
} from './helpers';

test.describe('Cleaner journey', () => {
	test.describe('Authenticated flows', () => {
		test.beforeEach(async ({ page }) => {
			await setupCleanerMocks(page);
			await page.goto('/cleaner/dashboard');
		});

		test('shows dashboard with stats', async ({ page }) => {
			await expectOnDashboard(page, 'cleaner');

			await expect(page.getByText(DICT.DASHBOARD.CLEANER.STATS.ASSIGNED)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.CLEANER.STATS.ACTIVE)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.CLEANER.STATS.COMPLETED)).toBeVisible();
			await expect(page.getByText(DICT.DASHBOARD.CLEANER.STATS.TOTAL_EARNINGS)).toBeVisible();
		});

		test('navigates to cleanings page and sees assigned cleanings', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await expect(page).toHaveURL(/\/cleaner\/cleanings/);
			await expect(page.getByRole('heading', { name: DICT.CLEANINGS.TITLE })).toBeVisible();

			await expect(page.getByText('123 Test Street').first()).toBeVisible();
		});

		test('views cleaning detail with clock-in button', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await page.getByText('123 Test Street').first().click();

			await expect(page.getByText('123 Test Street').first()).toBeVisible();

			await expect(
				page.getByRole('button', { name: DICT.CLEANINGS.DETAIL.CLOCK_IN.BUTTON }),
			).toBeVisible();
		});

		test('clocks in for a confirmed cleaning', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await page.getByText('123 Test Street').first().click();

			await page.getByRole('button', { name: DICT.CLEANINGS.DETAIL.CLOCK_IN.BUTTON }).click();

			await expectToast(page, DICT.CLEANINGS.DETAIL.CLOCK_IN.SUCCESS);
		});

		test('completes a cleaning and submits report', async ({ page }) => {
			const cleanerUser = buildUser('cleaner');
			const tasks: MockTask[] = [
				buildTask({ cleaning_id: MOCK_UUIDS.CLEANING_2, is_completed: true }),
				buildTask({
					id: MOCK_UUIDS.TASK_2,
					cleaning_id: MOCK_UUIDS.CLEANING_2,
					description: 'Clean kitchen surfaces',
					is_completed: true,
				}),
			];
			const cleanings: MockCleaning[] = [
				buildCleaning({
					id: MOCK_UUIDS.CLEANING_2,
					cleaner_id: cleanerUser.id,
					status: 'in_progress',
					clock_in_time: '2025-07-01T09:00:00Z',
				}),
			];

			await setupCleanerMocks(page, {
				cleanings,
				tasks,
			});
			await page.goto('/cleaner/dashboard');
			await expectOnDashboard(page, 'cleaner');

			await clickNavLink(page, DICT.NAV.CLEANINGS);

			await page.getByText('123 Test Street').first().click();

			await expect(
				page.getByRole('button', { name: DICT.CLEANINGS.DETAIL.COMPLETION.BUTTON_FINISH }),
			).toBeVisible();

			await page
				.getByRole('button', { name: DICT.CLEANINGS.DETAIL.COMPLETION.BUTTON_FINISH })
				.click();

			const fileInput = page.locator('input[type="file"]').first();
			await fileInput.setInputFiles({
				name: 'evidence.webp',
				mimeType: 'image/webp',
				buffer: Buffer.from('fake-image-data'),
			});

			await page
				.getByRole('button', { name: DICT.CLEANINGS.DETAIL.COMPLETION.BUTTON_COMPLETE })
				.click();

			await expectToast(page, DICT.CLEANINGS.DETAIL.COMPLETION.SUCCESS);
		});

		test('shows empty state when no cleanings are assigned', async ({ page }) => {
			const _cleanerUser = buildUser('cleaner');
			await setupCleanerMocks(page, { cleanings: [], tasks: [] });
			await page.goto('/cleaner/cleanings');

			await expect(page.getByText(DICT.CLEANINGS.EMPTY.MESSAGE_CLEANER)).toBeVisible();
		});

		test('signs out', async ({ page }) => {
			await clickNavLink(page, DICT.NAV.ACCOUNT);

			await expect(page).toHaveURL(/\/cleaner\/account/);
			await expect(page.getByRole('heading', { name: DICT.ACCOUNT.TITLE })).toBeVisible();

			await page.getByRole('button', { name: DICT.ACCOUNT.BUTTON_SIGN_OUT }).click();

			await expect(page).toHaveURL(/\/login/);
			await expect(page.getByRole('heading', { name: DICT.AUTH.LOGIN.TITLE })).toBeVisible();
		});
	});
});
