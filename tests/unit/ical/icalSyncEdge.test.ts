import { describe, expect, it, vi } from 'vitest';
import { parseIcs } from '../../../supabase/functions/_shared/ical.ts';
import { getDialect } from '../../../supabase/functions/_shared/platform.ts';
import {
	type FeedRecord,
	processFeed,
	type SyncDb,
	type SyncDeps,
	syncBatch,
	syncFeedById,
} from '../../../supabase/functions/ical-sync/sync.ts';

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
			timezone: 'Europe/London',
			defaultCleaningTime: '11:00:00',
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

function buildDeps(
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

const AIRBNB_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 1.2.5//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260918
DTEND;VALUE=DATE:20260921
UID:booking-1001@airbnb
DESCRIPTION:CHECKIN: 18/09/2026\nCHECKOUT: 21/09/2026\nNIGHTS: 3\nGUESTS: 2
SUMMARY:Maria Rodriguez (HMRDN4521)
END:VEVENT
END:VCALENDAR`;

const AIRBNB_CHANGED_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 1.2.5//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260920
DTEND;VALUE=DATE:20260923
UID:booking-1001@airbnb
DESCRIPTION:CHECKIN: 20/09/2026\nCHECKOUT: 23/09/2026\nNIGHTS: 3\nGUESTS: 2
SUMMARY:Maria Rodriguez (HMRDN4521)
END:VEVENT
END:VCALENDAR`;

const EMPTY_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
END:VCALENDAR`;

function okFetch(body: string) {
	return vi.fn().mockResolvedValue({
		status: 'ok' as const,
		body,
		etag: null,
		lastModified: null,
	});
}

describe('processFeed — create', () => {
	it('creates a cleaning and upserts an event for a new booking', async () => {
		const db = buildMockDb();
		const deps = buildDeps(db, okFetch(AIRBNB_ICS));

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.createCleaning).toHaveBeenCalledTimes(1);
		const createArg = vi.mocked(db.createCleaning).mock.calls[0][0];
		expect(createArg.source).toBe('airbnb');
		expect(db.upsertEvent).toHaveBeenCalledTimes(1);
		const upsertArg = vi.mocked(db.upsertEvent).mock.calls[0][0];
		expect(upsertArg.uid).toBe('booking-1001@airbnb');
		expect(upsertArg.status).toBe('active');
	});

	it('passes generic source for generic feed', async () => {
		const db = buildMockDb();
		const deps = buildDeps(db, okFetch(AIRBNB_ICS));

		const feed = buildFeed({ source: 'generic' });
		const result = await processFeed(deps, feed);
		expect(result.ok).toBe(true);
		expect(db.createCleaning).toHaveBeenCalledTimes(1);
		const createArg = vi.mocked(db.createCleaning).mock.calls[0][0];
		expect(createArg.source).toBe('generic');
	});
});

describe('processFeed — update date', () => {
	it('updates cleaning date when scheduled_start differs', async () => {
		const existingEvent = {
			id: 'evt-1',
			uid: 'booking-1001@airbnb',
			cleaningId: 'clean-1',
			status: 'active',
			startDate: '2026-09-18',
			endDate: '2026-09-21',
		};
		const db = buildMockDb({
			getEventByUid: vi.fn().mockResolvedValue(existingEvent),
			getCleaning: vi.fn().mockResolvedValue({
				id: 'clean-1',
				status: 'requested',
				scheduledStart: '2026-09-21T10:00:00.000Z',
				cleanerId: null,
				deletedAt: null,
			}),
		});
		const deps = buildDeps(db, okFetch(AIRBNB_CHANGED_ICS));

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.updateCleaningDate).toHaveBeenCalled();
	});
});

describe('processFeed — block events', () => {
	it('upserts block events without creating cleanings', async () => {
		const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261001
DTEND;VALUE=DATE:20261005
UID:block-1002@airbnb
DESCRIPTION:Blocked by owner
SUMMARY:Not available
END:VEVENT
END:VCALENDAR`;
		const db = buildMockDb();
		const deps = buildDeps(db, okFetch(ics));

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.createCleaning).not.toHaveBeenCalled();
		expect(db.upsertEvent).toHaveBeenCalledTimes(1);
	});
});

describe('processFeed — tentative filtered', () => {
	it('ignores tentative events entirely', async () => {
		const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261001
DTEND;VALUE=DATE:20261005
UID:tentative-1004@airbnb
DESCRIPTION:Tentative
SUMMARY:Tentative reservation
END:VEVENT
END:VCALENDAR`;
		const db = buildMockDb();
		const deps = buildDeps(db, okFetch(ics));

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.createCleaning).not.toHaveBeenCalled();
		expect(db.upsertEvent).not.toHaveBeenCalled();
	});
});

describe('processFeed — no auto-cancel when started', () => {
	it('does not cancel an in_progress cleaning on event removal', async () => {
		const cleaning = {
			id: 'clean-ip',
			status: 'in_progress',
			scheduledStart: '2026-09-21T11:00:00.000Z',
			cleanerId: 'cleaner-1',
			deletedAt: null,
		};
		const existingEvent = {
			id: 'evt-ip',
			uid: 'removed-booking@airbnb',
			cleaningId: 'clean-ip',
			status: 'active',
			startDate: '2026-09-18',
			endDate: '2026-09-21',
		};
		const db = buildMockDb({
			getActiveEvents: vi.fn().mockResolvedValue([existingEvent]),
			getCleaning: vi.fn().mockResolvedValue(cleaning),
			hasCoveringEvent: vi.fn().mockResolvedValue(false),
		});
		const deps = buildDeps(db, okFetch(EMPTY_ICS));

		const result = await processFeed(deps, buildFeed());
		expect(result.ok).toBe(true);
		expect(db.cancelCleaning).not.toHaveBeenCalled();
	});
});

describe('processFeed — backoff notification', () => {
	it('sends a notification on the first consecutive failure', async () => {
		const feed = buildFeed({ consecutiveFailures: 0 });
		const db = buildMockDb();
		const deps = buildDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Connection refused',
			}),
		);

		const result = await processFeed(deps, feed);
		expect(result.ok).toBe(false);
		expect(db.insertNotification).toHaveBeenCalledTimes(1);
		const notif = vi.mocked(db.insertNotification).mock.calls[0][0];
		expect(notif.type).toBe('ical_sync_alert');
		expect(notif.userId).toBe('host-1');
		expect(notif.link).toBe('/host/properties?property_view=prop-1');
	});

	it('re-notifies on fourth consecutive failure (power of 2)', async () => {
		const feed = buildFeed({ consecutiveFailures: 3 });
		const db = buildMockDb();
		const deps = buildDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Still failing',
			}),
		);

		await processFeed(deps, feed);
		expect(db.insertNotification).toHaveBeenCalledTimes(1);
	});

	it('does not notify on third consecutive failure (not power of 2)', async () => {
		const feed = buildFeed({ consecutiveFailures: 2 });
		const db = buildMockDb();
		const deps = buildDeps(
			db,
			vi.fn().mockResolvedValue({
				status: 'error' as const,
				error: 'Still failing',
			}),
		);

		await processFeed(deps, feed);
		expect(db.insertNotification).not.toHaveBeenCalled();
	});
});

describe('syncFeedById', () => {
	it('returns error for non-existent feed', async () => {
		const deps = buildDeps();
		const result = await syncFeedById(deps, 'missing-id');
		expect(result.ok).toBe(false);
		expect(result.error).toBe('Feed not found');
	});

	it('returns error for inactive feed', async () => {
		const deps = buildDeps({
			getFeed: vi.fn().mockResolvedValue(buildFeed({ isActive: false })),
		});
		const result = await syncFeedById(deps, 'feed-1');
		expect(result.ok).toBe(false);
		expect(result.error).toBe('Feed is inactive');
	});
});

describe('syncBatch', () => {
	it('processes feeds and returns count', async () => {
		const db = buildMockDb({
			getFeeds: vi.fn().mockResolvedValue({
				feeds: [buildFeed({ id: 'f1' }), buildFeed({ id: 'f2' })],
				hasMore: false,
			}),
		});
		const deps = buildDeps(db);
		const result = await syncBatch(deps, 20, 5);
		expect(result.processed).toBe(2);
		expect(result.remaining).toBe(false);
	});
});
