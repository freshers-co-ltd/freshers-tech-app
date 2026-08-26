import { describe, expect, it, vi } from 'vitest';
import { parseIcs } from '../../../supabase/functions/_shared/ical.ts';
import { getDialect } from '../../../supabase/functions/_shared/platform.ts';
import type { FeedRecord, SyncDb, SyncDeps } from '../../../supabase/functions/ical-sync/sync.ts';
import { isFeedEligible, processFeed } from '../../../supabase/functions/ical-sync/sync.ts';

const PROPERTY_TIMEZONE = 'Europe/London';
const DEFAULT_CLEANING_TIME = '11:00:00';
const CYCLE_MS = 30 * 60 * 1000;

function buildFeed(overrides: Partial<FeedRecord> = {}): FeedRecord {
	return {
		id: 'feed-1',
		propertyId: 'prop-1',
		source: 'airbnb',
		isActive: true,
		etag: null,
		lastModified: null,
		lastSyncedAt: null,
		consecutiveFailures: 0,
		property: {
			hostId: 'host-1',
			timezone: PROPERTY_TIMEZONE,
			defaultCleaningTime: DEFAULT_CLEANING_TIME,
			pricePerCleaning: null,
			address: '123 Test St',
		},
		...overrides,
	};
}

describe('isFeedEligible — skip-curve', () => {
	it('allows feeds with fewer than 3 consecutive failures', () => {
		const feed = buildFeed({ consecutiveFailures: 0, lastSyncedAt: new Date().toISOString() });
		expect(isFeedEligible(feed, Date.now())).toBe(true);
	});

	it('allows feeds with 2 consecutive failures', () => {
		const feed = buildFeed({ consecutiveFailures: 2, lastSyncedAt: new Date().toISOString() });
		expect(isFeedEligible(feed, Date.now())).toBe(true);
	});

	it('skips feeds with 3 failures if last attempt was within skip cycle', () => {
		const now = Date.now();
		const feed = buildFeed({
			consecutiveFailures: 3,
			lastSyncedAt: new Date(now - CYCLE_MS).toISOString(),
		});
		expect(isFeedEligible(feed, now)).toBe(false);
	});

	it('allows feeds with 3 failures after skip cycle elapses', () => {
		const now = Date.now();
		const skipCycles = 2 ** (3 - 3) + 1;
		const feed = buildFeed({
			consecutiveFailures: 3,
			lastSyncedAt: new Date(now - skipCycles * CYCLE_MS - 1000).toISOString(),
		});
		expect(isFeedEligible(feed, now)).toBe(true);
	});

	it('skips feeds with 5 failures for longer period', () => {
		const now = Date.now();
		const skipCycles = 2 ** (5 - 3) + 1;
		const feed = buildFeed({
			consecutiveFailures: 5,
			lastSyncedAt: new Date(now - skipCycles * CYCLE_MS + 1000).toISOString(),
		});
		expect(isFeedEligible(feed, now)).toBe(false);
	});

	it('allows feeds with no lastSyncedAt regardless of failures', () => {
		const feed = buildFeed({ consecutiveFailures: 10, lastSyncedAt: null });
		expect(isFeedEligible(feed, Date.now())).toBe(true);
	});
});

describe('processFeed — error handling', () => {
	it('notifies on first failure', async () => {
		const feed = buildFeed({ consecutiveFailures: 0 });
		const db = buildMockDb();
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Connection timeout',
			}),
		);

		const result = await processFeed(deps, feed);
		expect(result.ok).toBe(false);
		expect(result.error).toBe('Connection timeout');
		expect(db.updateFeedStatus).toHaveBeenCalledWith(
			'feed-1',
			expect.objectContaining({ consecutiveFailures: 1 }),
		);
		expect(db.insertNotification).toHaveBeenCalledTimes(1);
	});

	it('notifies on second failure', async () => {
		const feed = buildFeed({ consecutiveFailures: 1 });
		const db = buildMockDb();
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Connection timeout',
			}),
		);

		await processFeed(deps, feed);
		expect(db.insertNotification).toHaveBeenCalledTimes(1);
	});

	it('does not notify on third failure', async () => {
		const feed = buildFeed({ consecutiveFailures: 2 });
		const db = buildMockDb();
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Network error',
			}),
		);

		const result = await processFeed(deps, feed);
		expect(result.ok).toBe(false);
		expect(db.updateFeedStatus).toHaveBeenCalledWith(
			'feed-1',
			expect.objectContaining({ consecutiveFailures: 3 }),
		);
		expect(db.insertNotification).not.toHaveBeenCalled();
	});

	it('re-notifies on fourth failure', async () => {
		const feed = buildFeed({ consecutiveFailures: 3 });
		const db = buildMockDb();
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Another error',
			}),
		);

		await processFeed(deps, feed);
		expect(db.insertNotification).toHaveBeenCalledTimes(1);
	});
});

describe('processFeed — 304 not modified', () => {
	it('returns ok and refreshes status without processing', async () => {
		const db = buildMockDb();
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'not_modified' as const,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.updateFeedStatus).toHaveBeenCalledWith(
			'feed-1',
			expect.objectContaining({ status: 'success' }),
		);
		expect(db.upsertEvent).not.toHaveBeenCalled();
		expect(db.createCleaning).not.toHaveBeenCalled();
	});
});

describe('processFeed — URL not configured', () => {
	it('fails when resolveFeedUrl returns null', async () => {
		const db = buildMockDb({
			resolveFeedUrl: vi.fn().mockResolvedValue(null),
		});
		const deps = buildMockDeps(db);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(false);
		expect(result.error).toBe('Calendar URL not configured');
	});
});

function buildMockDb(overrides: Partial<SyncDb> = {}): SyncDb {
	return {
		getFeeds: vi.fn().mockResolvedValue({ feeds: [], hasMore: false }),
		getFeed: vi.fn().mockResolvedValue(null),
		resolveFeedUrl: vi.fn().mockResolvedValue('https://example.com/cal.ics'),
		getEventByUid: vi.fn().mockResolvedValue(null),
		findEventByRange: vi.fn().mockResolvedValue(null),
		updateEventUid: vi.fn().mockResolvedValue(undefined),
		upsertEvent: vi.fn().mockResolvedValue(undefined),
		getActiveEvents: vi.fn().mockResolvedValue([]),
		getCleaning: vi.fn().mockResolvedValue(null),
		findCleaningForRange: vi.fn().mockResolvedValue(null),
		hasCoveringEvent: vi.fn().mockResolvedValue(false),
		createCleaning: vi.fn().mockResolvedValue('cleaning-1'),
		updateCleaningDate: vi.fn().mockResolvedValue(undefined),
		cancelCleaning: vi.fn().mockResolvedValue(undefined),
		markEventRemoved: vi.fn().mockResolvedValue(undefined),
		insertNotification: vi.fn().mockResolvedValue(undefined),
		updateFeedStatus: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

function buildMockDeps(
	dbOverrides: Partial<SyncDb> = {},
	fetchOverride?: SyncDeps['fetchIcs'],
): SyncDeps {
	return {
		db: buildMockDb(dbOverrides),
		fetchIcs: fetchOverride ?? vi.fn().mockResolvedValue({ status: 'not_modified' as const }),
		parseIcs,
		getDialect,
		now: () => new Date('2026-09-15T12:00:00Z'),
	};
}
