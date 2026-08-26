// @ts-nocheck
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getAllowedOrigin, jsonResponse } from '../_shared/cors.ts';
import { parseIcs } from '../_shared/ical.ts';
import { getDialect, type IcalSource } from '../_shared/platform.ts';
import {
	isFeedEligible,
	syncBatch,
	syncFeedById,
	type FeedRecord,
	type IcalEventRecord,
	type SyncDeps,
} from './sync.ts';

const FETCH_TIMEOUT_MS = 8_000;
const BATCH_SIZE = 20;
const CONCURRENCY = 5;

interface FeedRow {
	id: string;
	owner_id: string;
	property_id: string;
	source: string;
	is_active: boolean;
	etag: string | null;
	last_modified: string | null;
	last_synced_at: string | null;
	consecutive_failures: number;
	url_secret_id: string | null;
	properties: {
		host_id: string;
		timezone: string;
		default_cleaning_time: string;
		price_per_cleaning: number | null;
		address_line_1: string | null;
		town_city: string | null;
		deleted_at: string | null;
	} | null;
}

function toFeedRecord(row: FeedRow): FeedRecord | null {
	const property = row.properties;
	if (!property || property.deleted_at !== null) return null;
	return {
		id: row.id,
		propertyId: row.property_id,
		source: row.source as IcalSource,
		isActive: row.is_active,
		etag: row.etag,
		lastModified: row.last_modified,
		lastSyncedAt: row.last_synced_at,
		consecutiveFailures: row.consecutive_failures ?? 0,
		property: {
			hostId: property.host_id,
			timezone: property.timezone ?? 'Europe/London',
			defaultCleaningTime: property.default_cleaning_time ?? '11:00:00',
			pricePerCleaning: property.price_per_cleaning ?? null,
			address:
				[property.address_line_1, property.town_city].filter((part): part is string => part !== null).join(', ') ||
				'Unknown property',
		},
	};
}

async function fetchIcs(url: string, etag: string | null, lastModified: string | null) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const headers: Record<string, string> = { Accept: 'text/calendar' };
		if (etag) headers['If-None-Match'] = etag;
		if (lastModified) headers['If-Modified-Since'] = lastModified;
		const response = await fetch(url, {
			headers,
			redirect: 'follow',
			signal: controller.signal,
		});
		if (response.status === 304) return { status: 'not_modified' } as const;
		if (!response.ok) return { status: 'error', error: `HTTP ${response.status}` } as const;
		const body = await response.text();
		return {
			status: 'ok',
			body,
			etag: response.headers.get('ETag'),
			lastModified: response.headers.get('Last-Modified'),
		} as const;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Network error';
		return { status: 'error', error: message } as const;
	} finally {
		clearTimeout(timeout);
	}
}

function createSyncDeps(admin: SupabaseClient): SyncDeps {
	return {
		db: {
			async getFeeds(batchSize) {
				const { data, error } = await admin
					.from('ical_feeds')
					.select(
						'id, owner_id, property_id, source, is_active, etag, last_modified, last_synced_at, consecutive_failures, url_secret_id, properties(host_id, timezone, default_cleaning_time, price_per_cleaning, address_line_1, town_city, deleted_at)',
					)
					.eq('is_active', true)
					.order('last_synced_at', { ascending: true, nullsFirst: true })
					.limit(batchSize * 3);
				if (error) throw new Error(`Failed to load feeds: ${error.message}`);
				const now = Date.now();
				const eligible = (data ?? [])
					.map((row) => toFeedRecord(row as FeedRow))
					.filter((feed): feed is FeedRecord => feed !== null && isFeedEligible(feed, now));
				return { feeds: eligible.slice(0, batchSize), hasMore: eligible.length > batchSize };
			},
			async getFeed(feedId) {
				const { data, error } = await admin
					.from('ical_feeds')
					.select(
						'id, owner_id, property_id, source, is_active, etag, last_modified, last_synced_at, consecutive_failures, url_secret_id, properties(host_id, timezone, default_cleaning_time, price_per_cleaning, address_line_1, town_city, deleted_at)',
					)
					.eq('id', feedId)
					.maybeSingle();
				if (error) throw new Error(`Failed to load feed: ${error.message}`);
				return data ? toFeedRecord(data as FeedRow) : null;
			},
			async resolveFeedUrl(feedId) {
				const { data, error } = await admin.rpc('get_ical_feed_url', { p_feed_id: feedId });
				if (error) throw new Error(`Failed to resolve feed URL: ${error.message}`);
				return typeof data === 'string' && data !== '' ? data : null;
			},
			async getEventByUid(feedId, uid) {
				const { data, error } = await admin
					.from('ical_events')
					.select('id, cleaning_id, status, start_date, end_date')
					.eq('feed_id', feedId)
					.eq('uid', uid)
					.maybeSingle();
				if (error) throw new Error(`Failed to load event: ${error.message}`);
				return data
					? {
							id: data.id,
							uid: data.uid,
							cleaningId: data.cleaning_id,
							status: data.status,
							startDate: data.start_date,
							endDate: data.end_date,
						}
					: null;
			},
			async findEventByRange(feedId, startDate, endDate) {
				const { data, error } = await admin
					.from('ical_events')
					.select('id, uid, cleaning_id, status, start_date, end_date')
					.eq('feed_id', feedId)
					.eq('status', 'active')
					.eq('start_date', startDate)
					.eq('end_date', endDate)
					.maybeSingle();
				if (error) throw new Error(`Failed to find event by range: ${error.message}`);
				return data
					? {
							id: data.id,
							uid: data.uid,
							cleaningId: data.cleaning_id,
							status: data.status,
							startDate: data.start_date,
							endDate: data.end_date,
						}
					: null;
			},
			async updateEventUid(eventId, uid) {
				const { error } = await admin.from('ical_events').update({ uid }).eq('id', eventId);
				if (error) throw new Error(`Failed to update event UID: ${error.message}`);
			},
			async upsertEvent(record) {
				const { error } = await admin
					.from('ical_events')
					.upsert(
						{
							feed_id: record.feedId,
							uid: record.uid,
							summary: record.summary,
							start_date: record.startDate,
							end_date: record.endDate,
							cleaning_id: record.cleaningId,
							status: record.status,
						},
						{ onConflict: 'feed_id,uid' },
					);
				if (error) throw new Error(`Failed to upsert event: ${error.message}`);
			},
			async getActiveEvents(feedId) {
				const { data, error } = await admin
					.from('ical_events')
					.select('id, uid, cleaning_id, start_date, end_date')
					.eq('feed_id', feedId)
					.eq('status', 'active');
				if (error) throw new Error(`Failed to load events: ${error.message}`);
				return (data ?? []).map(
					(row): IcalEventRecord => ({
						id: row.id,
						uid: row.uid,
						cleaningId: row.cleaning_id,
						status: row.status,
						startDate: row.start_date,
						endDate: row.end_date,
					}),
				);
			},
			async getCleaning(cleaningId) {
				const { data, error } = await admin
					.from('cleanings')
					.select('id, status, scheduled_start, cleaner_id, deleted_at')
					.eq('id', cleaningId)
					.maybeSingle();
				if (error) throw new Error(`Failed to load cleaning: ${error.message}`);
				return data
					? {
							id: data.id,
							status: data.status,
							scheduledStart: data.scheduled_start,
							cleanerId: data.cleaner_id,
							deletedAt: data.deleted_at,
						}
					: null;
			},
			async findCleaningForRange(propertyId, startDate, endDate) {
				const { data, error } = await admin
					.from('ical_events')
					.select('cleaning_id, ical_feeds(property_id)')
					.eq('status', 'active')
					.eq('start_date', startDate)
					.eq('end_date', endDate)
					.not('cleaning_id', 'is', null);
				if (error) throw new Error(`Failed to find covering cleaning: ${error.message}`);
				for (const row of data ?? []) {
					const propertyIdMatch = (row.ical_feeds as { property_id: string } | null)?.property_id;
					if (propertyIdMatch === propertyId && row.cleaning_id) return row.cleaning_id;
				}
				return null;
			},
			async hasCoveringEvent(propertyId, startDate, endDate, excludeFeedId) {
				const { data, error } = await admin
					.from('ical_events')
					.select('id, ical_feeds(property_id), cleanings(status, deleted_at)')
					.eq('status', 'active')
					.eq('start_date', startDate)
					.eq('end_date', endDate)
					.neq('feed_id', excludeFeedId);
				if (error) throw new Error(`Failed to find covering event: ${error.message}`);
				return (data ?? []).some((row) => {
					const propertyMatch =
						(row.ical_feeds as { property_id: string } | null)?.property_id === propertyId;
					const cleaning = row.cleanings as { status: string | null; deleted_at: string | null } | null;
					const cleaningActive =
						!cleaning || (cleaning.status !== 'cancelled' && cleaning.deleted_at === null);
					return propertyMatch && cleaningActive;
				});
			},
			async createCleaning(input) {
				const { data, error } = await admin.rpc('create_cleaning_request', {
					p_property_id: input.propertyId,
					p_custom_tasks: [],
					p_information: input.information,
					p_scheduled_start: input.scheduledStart,
					p_stocks_included: false,
					p_source: input.source,
					p_confidence: input.confidence,
				});
				if (error) throw new Error(`Failed to create cleaning: ${error.message}`);
				if (typeof data !== 'string') throw new Error('Failed to create cleaning: invalid response');
				return data;
			},
			async updateCleaningDate(cleaningId, scheduledStart) {
				const { error } = await admin
					.from('cleanings')
					.update({ scheduled_start: scheduledStart })
					.eq('id', cleaningId);
				if (error) throw new Error(`Failed to update cleaning date: ${error.message}`);
			},
			async cancelCleaning(cleaningId) {
				const { error } = await admin.from('cleanings').update({ status: 'cancelled' }).eq('id', cleaningId);
				if (error) throw new Error(`Failed to cancel cleaning: ${error.message}`);
			},
			async markEventRemoved(eventId) {
				const { error } = await admin
					.from('ical_events')
					.update({ status: 'removed' })
					.eq('id', eventId);
				if (error) throw new Error(`Failed to mark event removed: ${error.message}`);
			},
			async insertNotification(input) {
				const { error } = await admin.from('notifications').insert({
					user_id: input.userId,
					type: input.type,
					title: input.title,
					message: input.message,
					data: input.data,
					link: input.link,
				});
				if (error) throw new Error(`Failed to insert notification: ${error.message}`);
			},
			async updateFeedStatus(feedId, input) {
				const updates: Record<string, unknown> = {
					last_sync_status: input.status,
					last_synced_at: input.lastSyncedAt,
				};
				if (input.error !== undefined) updates.last_sync_error = input.error ?? null;
				if (input.etag !== undefined) updates.etag = input.etag ?? null;
				if (input.lastModified !== undefined) updates.last_modified = input.lastModified ?? null;
				if (input.consecutiveFailures !== undefined) updates.consecutive_failures = input.consecutiveFailures;
				const { error } = await admin.from('ical_feeds').update(updates).eq('id', feedId);
				if (error) throw new Error(`Failed to update feed status: ${error.message}`);
			},
		},
		fetchIcs,
		parseIcs,
		getDialect,
		now: () => new Date(),
	};
}

Deno.serve(async (req: Request) => {
	const origin = getAllowedOrigin(req);
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders(origin) });
	}

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
		const icalWebhookSecret = Deno.env.get('ICAL_WEBHOOK_SECRET') ?? '';

		if (!supabaseUrl || !serviceRoleKey) {
			return jsonResponse({ error: 'Server configuration error' }, 500, origin);
		}

		const webhookOk = icalWebhookSecret !== '' && req.headers.get('Webhook-secret') === icalWebhookSecret;
		let isAuthorized = webhookOk;
		if (!isAuthorized) {
			const authHeader = req.headers.get('Authorization') ?? '';
			if (authHeader) {
				const userClient = createClient(supabaseUrl, anonKey, {
					global: { headers: { Authorization: authHeader } },
				});
				const {
					data: { user },
				} = await userClient.auth.getUser();
				if (user) {
					const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single();
					isAuthorized = profile?.role === 'host' || profile?.role === 'admin';
				}
			}
		}
		if (!isAuthorized) {
			return jsonResponse({ error: 'Unauthorized' }, 401, origin);
		}

		let feedId: string | null = null;
		try {
			const body = await req.json();
			const record = body as Record<string, unknown>;
			if (record && typeof record.feedId === 'string') {
				feedId = record.feedId;
			}
		} catch {
			feedId = null;
		}

		const admin = createClient(supabaseUrl, serviceRoleKey);
		const deps = createSyncDeps(admin);

		if (feedId) {
			const result = await syncFeedById(deps, feedId);
			if (!result.ok) {
				return jsonResponse({ ok: false, error: result.error ?? 'Sync failed' }, 422, origin);
			}
			return jsonResponse({ ok: true, feedId }, 200, origin);
		}

		const result = await syncBatch(deps, BATCH_SIZE, CONCURRENCY);
		return jsonResponse({ ok: true, processed: result.processed, remaining: result.remaining }, 200, origin);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Internal server error';
		console.error('[ical-sync] Fatal error:', message);
		return jsonResponse({ error: 'Internal server error' }, 500, origin);
	}
});