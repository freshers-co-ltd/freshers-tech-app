import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { parseIcs } from '../../../supabase/functions/_shared/ical.ts';
import { getDialect } from '../../../supabase/functions/_shared/platform.ts';
import {
	type FeedRecord,
	type IcalEventRecord,
	processFeed,
	type SyncDb,
	type SyncDeps,
	syncBatch,
} from '../../../supabase/functions/ical-sync/sync.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROPERTY_TIMEZONE = 'Europe/London';
const DEFAULT_CLEANING_TIME = '11:00:00';
const NOW = new Date('2026-09-15T12:00:00Z');

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
		now: () => NOW,
	};
}

function buildEventOpts(opts: {
	startDate?: string;
	endDate?: string;
	cleaningId?: string | null;
	status?: string;
	uid?: string;
}): IcalEventRecord {
	return {
		id: 'event-1',
		uid: opts.uid ?? 'uid-1',
		cleaningId: opts.cleaningId ?? null,
		status: opts.status ?? 'active',
		startDate: opts.startDate ?? '2026-09-18',
		endDate: opts.endDate ?? '2026-09-21',
	};
}

describe('processFeed — UID fallback', () => {
	it('re-activates by matching start_date/end_date when UID is new', async () => {
		const existingEvent = buildEventOpts({
			uid: 'old-uid',
			status: 'active',
			startDate: '2026-09-18',
			endDate: '2026-09-21',
		});
		const db = buildMockDb({
			getEventByUid: vi.fn().mockResolvedValue(null),
			findEventByRange: vi.fn().mockResolvedValue(existingEvent),
			updateEventUid: vi.fn().mockResolvedValue(undefined),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readRawAirbnb(),
				etag: null,
				lastModified: null,
			}),
		);

		const feed = buildFeed();
		const result = await processFeed(deps, feed);
		expect(result.ok).toBe(true);
		expect(db.updateEventUid).toHaveBeenCalledWith('event-1', 'booking-1001@airbnb');
	});
});

describe('processFeed — existing event with cancelled cleaning', () => {
	it('nullifies cleaningId when cleaning is cancelled', async () => {
		const existingEvent = buildEventOpts({
			uid: 'booking-1001@airbnb',
			cleaningId: 'clean-old',
		});
		const db = buildMockDb({
			getEventByUid: vi.fn().mockResolvedValue(existingEvent),
			getCleaning: vi.fn().mockResolvedValue({
				id: 'clean-old',
				status: 'cancelled',
				scheduledStart: '2026-09-21T11:00:00.000Z',
				cleanerId: null,
				deletedAt: null,
			}),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readRawAirbnb(),
				etag: null,
				lastModified: null,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.createCleaning).toHaveBeenCalled();
	});
});

describe('processFeed — removed events', () => {
	it('cancels requested cleaning when no covering event', async () => {
		const cleaning = {
			id: 'clean-1',
			status: 'requested',
			scheduledStart: '2026-09-21T11:00:00.000Z',
			cleanerId: null,
			deletedAt: null,
		};
		const existingEvent = buildEventOpts({
			uid: 'removed-uid',
			cleaningId: 'clean-1',
			endDate: '2026-10-01',
		});
		const db = buildMockDb({
			getActiveEvents: vi.fn().mockResolvedValue([existingEvent]),
			getCleaning: vi.fn().mockResolvedValue(cleaning),
			hasCoveringEvent: vi.fn().mockResolvedValue(false),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readMinimalCal(),
				etag: null,
				lastModified: null,
			}),
		);

		const feed = buildFeed();
		const result = await processFeed(deps, feed);
		expect(result.ok).toBe(true);
		expect(db.cancelCleaning).toHaveBeenCalledWith('clean-1');
		expect(db.insertNotification).toHaveBeenCalled();
	});

	it('skips cancellation for already-started cleaning', async () => {
		const cleaning = {
			id: 'clean-2',
			status: 'in_progress',
			scheduledStart: '2026-09-21T11:00:00.000Z',
			cleanerId: 'cleaner-1',
			deletedAt: null,
		};
		const existingEvent = buildEventOpts({
			uid: 'removed-uid-2',
			cleaningId: 'clean-2',
			endDate: '2026-10-01',
		});
		const db = buildMockDb({
			getActiveEvents: vi.fn().mockResolvedValue([existingEvent]),
			getCleaning: vi.fn().mockResolvedValue(cleaning),
			hasCoveringEvent: vi.fn().mockResolvedValue(false),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readMinimalCal(),
				etag: null,
				lastModified: null,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.cancelCleaning).not.toHaveBeenCalled();
	});

	it('skips cancellation for completed cleaning', async () => {
		const cleaning = {
			id: 'clean-3',
			status: 'completed',
			scheduledStart: '2026-09-21T11:00:00.000Z',
			cleanerId: 'cleaner-1',
			deletedAt: null,
		};
		const existingEvent = buildEventOpts({
			uid: 'removed-uid-3',
			cleaningId: 'clean-3',
			endDate: '2026-10-01',
		});
		const db = buildMockDb({
			getActiveEvents: vi.fn().mockResolvedValue([existingEvent]),
			getCleaning: vi.fn().mockResolvedValue(cleaning),
			hasCoveringEvent: vi.fn().mockResolvedValue(false),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readMinimalCal(),
				etag: null,
				lastModified: null,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.cancelCleaning).not.toHaveBeenCalled();
	});

	it('does not cancel when a covering event exists on another feed', async () => {
		const cleaning = {
			id: 'clean-4',
			status: 'requested',
			scheduledStart: '2026-09-21T11:00:00.000Z',
			cleanerId: null,
			deletedAt: null,
		};
		const existingEvent = buildEventOpts({
			uid: 'removed-uid-4',
			cleaningId: 'clean-4',
			endDate: '2026-10-01',
		});
		const db = buildMockDb({
			getActiveEvents: vi.fn().mockResolvedValue([existingEvent]),
			getCleaning: vi.fn().mockResolvedValue(cleaning),
			hasCoveringEvent: vi.fn().mockResolvedValue(true),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readMinimalCal(),
				etag: null,
				lastModified: null,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.cancelCleaning).not.toHaveBeenCalled();
		expect(db.markEventRemoved).toHaveBeenCalled();
	});
});

describe('processFeed — cross-feed dedup', () => {
	it('reuses existing cleaning from same property/date range', async () => {
		const db = buildMockDb({
			findCleaningForRange: vi.fn().mockResolvedValue('existing-clean'),
			getCleaning: vi.fn().mockResolvedValue({
				id: 'existing-clean',
				status: 'requested',
				scheduledStart: '2026-09-21T11:00:00.000Z',
				cleanerId: null,
				deletedAt: null,
			}),
		});
		const deps = buildMockDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readRawAirbnb(),
				etag: null,
				lastModified: null,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.createCleaning).not.toHaveBeenCalled();
		expect(db.upsertEvent).toHaveBeenCalled();
	});
});

describe('processFeed — past events are skipped', () => {
	it('skips events whose endDate is before today', async () => {
		const deps = buildMockDeps(
			buildMockDb(),
			vi.fn().mockResolvedValue({
				status: 'ok' as const,
				body: readPastEventCal(),
				etag: null,
				lastModified: null,
			}),
		);

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(deps.db.createCleaning).not.toHaveBeenCalled();
	});
});

describe('syncBatch', () => {
	it('returns processed count and remaining flag', async () => {
		const db = buildMockDb({
			getFeeds: vi.fn().mockResolvedValue({
				feeds: [buildFeed({ id: 'f1' }), buildFeed({ id: 'f2' })],
				hasMore: true,
			}),
		});
		const deps = buildMockDeps(db);
		const result = await syncBatch(deps, 20, 5);
		expect(result.processed).toBe(2);
		expect(result.remaining).toBe(true);
	});
});

function readRawAirbnb(): string {
	return readFileSync(resolve(__dirname, '../../fixtures/ical/airbnb/calendar.ics'), 'utf-8');
}

function readMinimalCal(): string {
	return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261001
DTEND;VALUE=DATE:20261005
UID:different-uid@test
DESCRIPTION:Placeholder
SUMMARY:Placeholder
END:VEVENT
END:VCALENDAR`;
}

function readPastEventCal(): string {
	return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260801
DTEND;VALUE=DATE:20260803
UID:past-1@test
DESCRIPTION:Old
SUMMARY:Old
END:VEVENT
END:VCALENDAR`;
}
