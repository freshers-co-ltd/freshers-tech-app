import { type BrowserContext, expect, test } from '@playwright/test';
import { DICT } from './constants';
import { setupAdminMocks, setupCleanerMocks, setupHostMocks } from './helpers';

test.describe('Cross-role scenarios', () => {
	test('each role sees correct navigation links', async ({ browser }) => {
		const hostCtx: BrowserContext = await browser.newContext();
		const hostPage = await hostCtx.newPage();
		await setupHostMocks(hostPage);
		await hostPage.goto('/host/dashboard');
		await expect(hostPage.getByRole('link', { name: DICT.NAV.DASHBOARD })).toBeVisible();
		await expect(hostPage.getByRole('link', { name: DICT.NAV.CLEANINGS })).toBeVisible();
		await expect(hostPage.getByRole('link', { name: DICT.NAV.PROPERTIES })).toBeVisible();
		await expect(hostPage.getByRole('link', { name: DICT.NAV.ACCOUNT })).toBeVisible();
		await hostCtx.close();

		const cleanerCtx: BrowserContext = await browser.newContext();
		const cleanerPage = await cleanerCtx.newPage();
		await setupCleanerMocks(cleanerPage);
		await cleanerPage.goto('/cleaner/dashboard');
		await expect(cleanerPage.getByRole('link', { name: DICT.NAV.DASHBOARD })).toBeVisible();
		await expect(cleanerPage.getByRole('link', { name: DICT.NAV.CLEANINGS })).toBeVisible();
		await expect(cleanerPage.getByRole('link', { name: DICT.NAV.ACCOUNT })).toBeVisible();
		await expect(cleanerPage.getByRole('link', { name: DICT.NAV.PROPERTIES })).not.toBeVisible();
		await cleanerCtx.close();

		const adminCtx: BrowserContext = await browser.newContext();
		const adminPage = await adminCtx.newPage();
		await setupAdminMocks(adminPage);
		await adminPage.goto('/admin/dashboard');
		await expect(adminPage.getByRole('link', { name: DICT.NAV.DASHBOARD })).toBeVisible();
		await expect(adminPage.getByRole('link', { name: DICT.NAV.USERS })).toBeVisible();
		await expect(adminPage.getByRole('link', { name: DICT.NAV.CLEANINGS })).toBeVisible();
		await expect(adminPage.getByRole('link', { name: DICT.NAV.ANALYTICS })).toBeVisible();
		await expect(adminPage.getByRole('link', { name: DICT.NAV.ACCOUNT })).toBeVisible();
		await adminCtx.close();
	});

	test('host cannot access cleaner routes', async ({ browser }) => {
		const ctx: BrowserContext = await browser.newContext();
		const page = await ctx.newPage();
		await setupHostMocks(page);

		await page.goto('/cleaner/dashboard');

		await expect(page).toHaveURL(/\/error\/403/);
		await ctx.close();
	});

	test('cleaner cannot access admin routes', async ({ browser }) => {
		const ctx: BrowserContext = await browser.newContext();
		const page = await ctx.newPage();
		await setupCleanerMocks(page);

		await page.goto('/admin/users');

		await expect(page).toHaveURL(/\/error\/403/);
		await ctx.close();
	});

	test('host cannot access admin routes', async ({ browser }) => {
		const ctx: BrowserContext = await browser.newContext();
		const page = await ctx.newPage();
		await setupHostMocks(page);

		await page.goto('/admin/dashboard');

		await expect(page).toHaveURL(/\/error\/403/);
		await ctx.close();
	});

	test('host properties visible, cleaner sees assigned cleaning via admin assignment', async ({
		browser,
	}) => {
		const hostCtx: BrowserContext = await browser.newContext();
		const hostPage = await hostCtx.newPage();
		await setupHostMocks(hostPage);
		await hostPage.goto('/host/properties');
		await expect(hostPage.getByText('123 Test Street').first()).toBeVisible();
		await hostCtx.close();

		const adminCtx: BrowserContext = await browser.newContext();
		const adminPage = await adminCtx.newPage();
		await setupAdminMocks(adminPage);
		await adminPage.goto('/admin/users');

		const isMobile = test.info().project.name.includes('Mobile');
		if (isMobile) {
			await expect(adminPage.getByText('Alice Host').first()).toBeVisible();
		} else {
			await expect(adminPage.getByRole('cell', { name: 'Alice Host' })).toBeVisible();
		}
		await adminCtx.close();

		const cleanerCtx: BrowserContext = await browser.newContext();
		const cleanerPage = await cleanerCtx.newPage();
		await setupCleanerMocks(cleanerPage);
		await cleanerPage.goto('/cleaner/cleanings');
		await expect(cleanerPage.getByText('123 Test Street').first()).toBeVisible();
		await cleanerCtx.close();
	});
});
