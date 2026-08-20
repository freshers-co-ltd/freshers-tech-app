// @ts-nocheck
import type { IcalRawEvent, ParseIcsResult } from '../_shared/ical.ts';
import {
	deriveEndDate,
	extractCheckoutTime,
	formatIsoDate,
	parseClockTime,
	utcToZonedDate,
	zonedToUtc,
} from '../_shared/ical.ts';
import { classifyEvent, type IcalSource, type PlatformDialect } from '../_shared/platform.ts';

export type SyncStatus = 'success' | 'error';

export interface FeedProperty {
	hostId: string;
	timezone: string;
	defaultCleaningTime: string;
	pricePerCleaning: number | null;
	address: string;
}

export interface FeedRecord {
	id: string;
	propertyId: string;
	source: IcalSource;
	isActive: boolean;
	etag: string | null;
	lastModified: string | null;
	lastSyncedAt: string | null;
	consecutiveFailures: number;
	property: FeedProperty | null;
}

export interface CleaningRecord {
	id: string;
	status: string;
	scheduledStart: string;
	cleanerId: string | null;
	deletedAt: string | null;
}

export interface IcalEventRecord {
	id: string;
	uid: string;
	cleaningId: string | null;
	status: string;
	startDate: string;
	endDate: string;
}

export interface SyncDb {
	getFeeds(batchSize: number): Promise<{ feeds: FeedRecord[]; hasMore: boolean }>;
	getFeed(feedId: string): Promise<FeedRecord | null>;
	resolveFeedUrl(feedId: string): Promise<string | null>;
	getEventByUid(feedId: string, uid: string): Promise<IcalEventRecord | null>;
	findEventByRange(feedId: string, startDate: string, endDate: string): Promise<IcalEventRecord | null>;
	updateEventUid(eventId: string, uid: string): Promise<void>;
	upsertEvent(record: {
		feedId: string;
		uid: string;
		summary: string | null;
		startDate: string;
		endDate: string;
		cleaningId: string | null;
		status: 'active' | 'removed';
	}): Promise<void>;
	getActiveEvents(feedId: string): Promise<IcalEventRecord[]>;
	getCleaning(cleaningId: string): Promise<CleaningRecord | null>;
	findCleaningForRange(propertyId: string, startDate: string, endDate: string): Promise<string | null>;
	hasCoveringEvent(propertyId: string, startDate: string, endDate: string, excludeFeedId: string): Promise<boolean>;
	createCleaning(input: {
		propertyId: string;
		hostId: string;
		scheduledStart: string;
		information: string | null;
	}): Promise<string>;
	updateCleaningDate(cleaningId: string, scheduledStart: string): Promise<void>;
	cancelCleaning(cleaningId: string): Promise<void>;
	markEventRemoved(eventId: string): Promise<void>;
	insertNotification(input: {
		userId: string;
		type: string;
		title: string;
		message: string;
		data: Record<string, unknown>;
		link: string;
	}): Promise<void>;
	updateFeedStatus(
		feedId: string,
		input: {
			status: SyncStatus;
			error?: string | null;
			etag?: string | null;
			lastModified?: string | null;
			consecutiveFailures?: number;
			lastSyncedAt: string;
		},
	): Promise<void>;
}

export interface SyncDeps {
	db: SyncDb;
	fetchIcs(
		url: string,
		etag: string | null,
		lastModified: string | null,
	): Promise<
		| { status: 'ok'; body: string; etag: string | null; lastModified: string | null }
		| { status: 'not_modified' }
		| { status: 'error'; error: string }
	>;
	parseIcs(text: string): ParseIcsResult;
	getDialect(source: IcalSource): PlatformDialect;
	now(): Date;
}

const CYCLE_MS = 30 * 60 * 1000;

export function isFeedEligible(feed: FeedRecord, nowMs: number): boolean {
	if (feed.consecutiveFailures < 3) return true;
	if (!feed.lastSyncedAt) return true;
	const skipCycles = 2 ** (feed.consecutiveFailures - 3) + 1;
	const lastAttempt = Date.parse(feed.lastSyncedAt);
	return nowMs - lastAttempt >= skipCycles * CYCLE_MS;
}

export async function processFeed(
	deps: SyncDeps,
	feed: FeedRecord,
): Promise<{ ok: boolean; error?: string }> {
	const property = feed.property;
	if (!property) return { ok: false, error: 'Property not found' };

	const now = deps.now();
	const nowMs = now.getTime();
	const today = utcToZonedDate(nowMs, property.timezone);
	const todayIso = formatYmd(today);

	const url = await deps.db.resolveFeedUrl(feed.id);
	if (!url) {
		await failFeed(deps, feed, 'Calendar URL not configured', now);
		return { ok: false, error: 'Calendar URL not configured' };
	}

	const fetched = await deps.fetchIcs(url, feed.etag, feed.lastModified);
	if (fetched.status === 'error') {
		await failFeed(deps, feed, fetched.error, now);
		return { ok: false, error: fetched.error };
	}
	if (fetched.status === 'not_modified') {
		await deps.db.updateFeedStatus(feed.id, { status: 'success', lastSyncedAt: now.toISOString() });
		return { ok: true };
	}

	let parsed: ParseIcsResult;
	try {
		parsed = deps.parseIcs(fetched.body);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid calendar data';
		await failFeed(deps, feed, message, now);
		return { ok: false, error: message };
	}

	const dialect = deps.getDialect(feed.source);
	const seenUids = new Set<string>();

	for (const rawEvent of parsed.events) {
		const normalizedEvent = deriveEndDate(rawEvent);
		if (!normalizedEvent.dtstart || !normalizedEvent.dtend) continue;
		const classification = classifyEvent(dialect, normalizedEvent);
		if (classification.kind === 'tentative') continue;
		const startDate = formatIsoDate(normalizedEvent.dtstart);
		const endDate = formatIsoDate(normalizedEvent.dtend);
		if (endDate < todayIso) continue;
		seenUids.add(normalizedEvent.uid);

		const existingByUid = await deps.db.getEventByUid(feed.id, normalizedEvent.uid);

		if (classification.kind === 'block') {
			await deps.db.upsertEvent({
				feedId: feed.id,
				uid: normalizedEvent.uid,
				summary: normalizedEvent.summary,
				startDate,
				endDate,
				cleaningId: existingByUid?.cleaningId ?? null,
				status: 'active',
			});
			continue;
		}

		let existing = existingByUid;
		if (!existing) {
			const byRange = await deps.db.findEventByRange(feed.id, startDate, endDate);
			if (byRange && byRange.status === 'active') {
				await deps.db.updateEventUid(byRange.id, normalizedEvent.uid);
				existing = { ...byRange, uid: normalizedEvent.uid };
			}
		}

		let cleaningId = existing?.cleaningId ?? null;
		if (cleaningId) {
			const cleaning = await deps.db.getCleaning(cleaningId);
			if (cleaning && cleaning.deletedAt === null && cleaning.status !== 'cancelled') {
				const scheduled = computeScheduledStart(deps, normalizedEvent, property);
				if (scheduled !== cleaning.scheduledStart) {
					await deps.db.updateCleaningDate(cleaningId, scheduled);
				}
			} else {
				cleaningId = null;
			}
		}
		if (!cleaningId) {
			const covering = await deps.db.findCleaningForRange(feed.propertyId, startDate, endDate);
			if (covering) {
				const cleaning = await deps.db.getCleaning(covering);
				if (cleaning && cleaning.deletedAt === null && cleaning.status !== 'cancelled') {
					cleaningId = covering;
				}
			}
		}
		if (!cleaningId) {
			const scheduled = computeScheduledStart(deps, normalizedEvent, property);
			cleaningId = await deps.db.createCleaning({
				propertyId: feed.propertyId,
				hostId: property.hostId,
				scheduledStart: scheduled,
				information: normalizedEvent.summary,
			});
		}
		await deps.db.upsertEvent({
			feedId: feed.id,
			uid: normalizedEvent.uid,
			summary: normalizedEvent.summary,
			startDate,
			endDate,
			cleaningId,
			status: 'active',
		});
	}

	const activeEvents = await deps.db.getActiveEvents(feed.id);
	for (const event of activeEvents) {
		if (seenUids.has(event.uid)) continue;
		if (event.endDate < todayIso) continue;
		await deps.db.markEventRemoved(event.id);
		if (!event.cleaningId) continue;
		const cleaning = await deps.db.getCleaning(event.cleaningId);
		if (!cleaning || cleaning.deletedAt !== null) continue;
		const covered = await deps.db.hasCoveringEvent(feed.propertyId, event.startDate, event.endDate, feed.id);
		if (covered) continue;
		const humanDate = formatHumanDate(event.startDate);
		if (cleaning.status === 'requested' || cleaning.status === 'confirmed') {
			await deps.db.cancelCleaning(event.cleaningId);
			await deps.db.insertNotification({
				userId: property.hostId,
				type: 'ical_sync_alert',
				title: 'Calendar Update',
				message: `A booking was removed at ${property.address}. The cleaning on ${humanDate} has been cancelled.`,
				data: { cleaning_id: event.cleaningId, property_id: feed.propertyId, feed_id: feed.id },
				link: '/host/cleanings',
			});
			if (cleaning.cleanerId) {
				await deps.db.insertNotification({
					userId: cleaning.cleanerId,
					type: 'cleaning_cancelled',
					title: 'Cleaning Cancelled',
					message: `The cleaning at ${property.address} on ${humanDate} has been cancelled.`,
					data: { cleaning_id: event.cleaningId, property_id: feed.propertyId },
					link: '/cleaner/cleanings',
				});
			}
		} else {
			await deps.db.insertNotification({
				userId: property.hostId,
				type: 'ical_sync_alert',
				title: 'Calendar Update',
				message: `A booking was removed at ${property.address}.`,
				data: { cleaning_id: event.cleaningId, property_id: feed.propertyId, feed_id: feed.id },
				link: '/host/cleanings',
			});
		}
	}

	await deps.db.updateFeedStatus(feed.id, {
		status: 'success',
		etag: fetched.etag,
		lastModified: fetched.lastModified,
		consecutiveFailures: 0,
		lastSyncedAt: now.toISOString(),
	});
	return { ok: true };
}

function computeScheduledStart(deps: SyncDeps, event: IcalRawEvent, property: FeedProperty): string {
	const end = event.dtend;
	if (!end) throw new Error('Event has no end date');
	const checkout = extractCheckoutTime(event.description);
	let hour: number;
	let minute: number;
	if (checkout) {
		hour = checkout.hour + 1;
		minute = checkout.minute;
	} else {
		const clock = parseClockTime(property.defaultCleaningTime);
		hour = clock.hour;
		minute = clock.minute;
	}
	const zone = end.isUtc ? 'UTC' : (end.tzid ?? property.timezone);
	const instant = zonedToUtc(zone, end.year, end.month, end.day, hour, minute);
	return new Date(instant).toISOString();
}

async function failFeed(deps: SyncDeps, feed: FeedRecord, error: string, now: Date): Promise<void> {
	const consecutiveFailures = feed.consecutiveFailures + 1;
	await deps.db.updateFeedStatus(feed.id, {
		status: 'error',
		error: error.slice(0, 500),
		consecutiveFailures,
		lastSyncedAt: now.toISOString(),
	});
	if (consecutiveFailures === 3 && feed.property) {
		await deps.db.insertNotification({
			userId: feed.property.hostId,
			type: 'ical_sync_alert',
			title: 'Calendar Sync Failed',
			message: `We couldn't sync the calendar for ${feed.property.address}. Please check the calendar link.`,
			data: { feed_id: feed.id, property_id: feed.propertyId },
			link: '/host/properties',
		});
	}
}

export async function syncFeedById(
	deps: SyncDeps,
	feedId: string,
): Promise<{ ok: boolean; error?: string }> {
	const feed = await deps.db.getFeed(feedId);
	if (!feed) return { ok: false, error: 'Feed not found' };
	if (!feed.isActive) return { ok: false, error: 'Feed is inactive' };
	return processFeed(deps, feed);
}

export async function syncBatch(
	deps: SyncDeps,
	batchSize: number,
	concurrency: number,
): Promise<{ processed: number; remaining: boolean }> {
	const { feeds, hasMore } = await deps.db.getFeeds(batchSize);
	await processFeeds(deps, feeds, concurrency);
	return { processed: feeds.length, remaining: hasMore };
}

async function processFeeds(deps: SyncDeps, feeds: FeedRecord[], concurrency: number): Promise<void> {
	const queue = [...feeds];
	const workers: Array<Promise<void>> = [];
	const workerCount = Math.min(concurrency, queue.length);
	for (let i = 0; i < workerCount; i++) {
		workers.push(
			(async () => {
				let feed = queue.shift();
				while (feed) {
					await processFeed(deps, feed);
					feed = queue.shift();
				}
			})(),
		);
	}
	await Promise.all(workers);
}

function pad2(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

function formatYmd(date: { year: number; month: number; day: number }): string {
	return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

function formatHumanDate(isoDate: string): string {
	const date = new Date(`${isoDate}T00:00:00Z`);
	return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}