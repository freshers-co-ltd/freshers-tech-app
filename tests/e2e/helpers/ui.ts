import { expect, type Page } from '@playwright/test';

export async function expectOnDashboard(
	page: Page,
	role: 'host' | 'cleaner' | 'admin',
): Promise<void> {
	await expect(page).toHaveURL(new RegExp(`/${role}/dashboard`));
	const heading = page.getByRole('heading', { name: /Welcome back/i });
	await expect(heading).toBeVisible({ timeout: 10000 });
}

export async function expectToast(page: Page, message: string): Promise<void> {
	const toast = page.locator('[data-sonner-toast]').filter({ hasText: message });
	await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function expectDialogWithTitle(page: Page, title: string): Promise<void> {
	await expect(
		page
			.locator('[role="dialog"], [role="alertdialog"]')
			.filter({
				has: page.getByRole('heading', { name: title }),
			})
			.first(),
	).toBeVisible({ timeout: 5000 });
}

export async function clickNavLink(page: Page, name: string): Promise<void> {
	await page.locator('nav:visible').first().getByRole('link', { name }).click();
}
