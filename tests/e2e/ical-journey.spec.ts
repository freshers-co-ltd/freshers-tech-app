import { expect, test } from '@playwright/test';
import { DICT } from './constants';
import {
	buildProperty,
	buildUser,
	expectDialogWithTitle,
	expectToast,
	seedAuthSession,
	setupSupabaseMocks,
} from './helpers';

const FUNCTIONS_ICAL = /\/functions\/v1\/ical-/;

const MOCK_FEED = {
	id: 'feed-1001',
	property_id: '',
	owner_id: '',
	source: 'airbnb',
	is_active: true,
	etag: null,
	last_modified: null,
	last_synced_at: null,
	consecutive_failures: 0,
	url_secret_id: 'secret-abc',
	url_display: 'https://www.airbnb.co.uk/calendar/ical/\u2022\u2022\u2022\u2022abcd',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

function buildPropertyWithFeed() {
	const property = buildProperty();
	MOCK_FEED.property_id = property.id;
	MOCK_FEED.owner_id = property.host_id;
	return property;
}

test.describe('iCal journey', () => {
	test.beforeEach(async ({ page }) => {
		const property = buildPropertyWithFeed();
		const user = buildUser('host');

		await seedAuthSession(page, user);

		await setupSupabaseMocks(page, {
			user,
			properties: [property],
		});

		await page.route(FUNCTIONS_ICAL, async (route) => {
			const url = route.request().url();
			if (url.includes('/sync')) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: { queued: true, feedId: 'feed-1001' } }),
				});
			} else if (url.includes('/create')) {
				const created = {
					...MOCK_FEED,
					id: 'feed-created',
					last_synced_at: new Date().toISOString(),
				};
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: created }),
				});
			} else if (url.includes('/delete')) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: { id: MOCK_FEED.id } }),
				});
			} else if (url.includes('/feeds')) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						data: [{ ...MOCK_FEED, properties: { address_line_1: '123 Test Street' } }],
					}),
				});
			} else {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: '{}',
				});
			}
		});
	});

	test('shows Calendar Sync section with masked URL', async ({ page }) => {
		await page.goto('/host/properties');
		await expect(page.getByText('123 Test Street').first()).toBeVisible();
		await page.getByText('123 Test Street').first().click();
		await expectDialogWithTitle(page, '123 Test Street');
		await expect(page.getByText(/abcd/)).toBeVisible();
	});

	test('opens Add calendar link dialog', async ({ page }) => {
		await page.goto('/host/properties');
		await page.getByText('123 Test Street').first().click();
		await expectDialogWithTitle(page, '123 Test Street');

		await page.getByRole('button', { name: DICT.ICAL.ADD }).click();
		await expectDialogWithTitle(page, DICT.ICAL.CREATE.TITLE);
	});

	test('triggers sync and shows toast', async ({ page }) => {
		await page.goto('/host/properties');
		await page.getByText('123 Test Street').first().click();
		await expectDialogWithTitle(page, '123 Test Street');

		await page
			.getByRole('button', { name: /Sync now/i })
			.first()
			.click();
		await expectToast(page, 'Sync started');
	});
});
