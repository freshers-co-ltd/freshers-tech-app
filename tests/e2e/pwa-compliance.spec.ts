import { expect, test } from '@playwright/test';

interface ManifestIcon {
	src: string;
	sizes: string;
	type?: string;
}

test('PWA meets modern installability criteria', async ({ page }) => {
	await page.goto('/');

	const manifestLink = page.locator('link[rel="manifest"]');
	await expect(manifestLink).toBeAttached();

	const manifestUrl = await manifestLink.getAttribute('href');

	if (!manifestUrl) {
		throw new Error('Manifest URL not found');
	}

	const response = await page.request.get(manifestUrl);
	const manifest = await response.json();

	const hasIcon = (size: string) =>
		manifest.icons?.some((i: ManifestIcon) => i.sizes.includes(size));

	expect(manifest.short_name).toBeDefined();
	expect(manifest.display).toMatch(/standalone|fullscreen|minimal-ui/);
	expect(hasIcon('192x192')).toBe(true);
	expect(hasIcon('512x512')).toBe(true);
});

test('Service Worker handles offline requests', async ({ browser, browserName }) => {
	test.skip(browserName === 'webkit', 'Offline emulation is unstable in WebKit');

	// Global config blocks SWs; allow them only for this test
	const context = await browser.newContext({ serviceWorkers: 'allow' });
	const page = await context.newPage();

	await page.goto('/');

	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

	await context.setOffline(true);
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.locator('h1')).toBeVisible();
	await context.setOffline(false);

	await context.close();
});
