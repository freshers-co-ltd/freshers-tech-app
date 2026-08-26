'use client';

import { FunctionsHttpError } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';
import type { ActionResult } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';
import {
	type CreateFeedPayload,
	type DeleteFeedPayload,
	type IcalFeed,
	isIcalSource,
	type UpdateFeedPayload,
} from './types';

const FUNCTION_NAME = 'ical-feeds';

interface FeedListResponse {
	data: IcalFeed[];
}

interface FeedResponse {
	data: IcalFeed;
}

interface FunctionErrorBody {
	error?: string;
	code?: string;
	detectedSource?: string;
}

const FUNCTION_ERROR_MESSAGES: Record<string, string> = {
	FETCH_FAILED: DICT.ICAL.ERRORS.FETCH_FAILED,
	INVALID_URL: DICT.ICAL.ERRORS.INVALID_URL,
	INVALID_CALENDAR: DICT.ICAL.ERRORS.INVALID_CALENDAR,
	PERSONAL_CALENDAR: DICT.ICAL.ERRORS.PERSONAL_CALENDAR,
	PLATFORM_MISMATCH: DICT.ICAL.ERRORS.PLATFORM_MISMATCH,
	FEED_EXISTS: DICT.ICAL.ERRORS.FEED_EXISTS,
	INVALID_SOURCE: DICT.ICAL.ERRORS.INVALID_SOURCE,
	PROPERTY_NOT_FOUND: DICT.ICAL.ERRORS.PROPERTY_NOT_FOUND,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};

const isFeedObject = (value: unknown): value is IcalFeed => {
	if (!isRecord(value)) {
		return false;
	}
	return (
		typeof value.id === 'string' &&
		typeof value.property_id === 'string' &&
		isIcalSource(value.source) &&
		typeof value.url_display === 'string' &&
		typeof value.is_active === 'boolean'
	);
};

const readErrorBody = async (error: unknown): Promise<FunctionErrorBody> => {
	if (!(error instanceof FunctionsHttpError)) {
		return {};
	}
	try {
		const body: unknown = await error.context.json();
		if (isRecord(body)) {
			return {
				error: typeof body.error === 'string' ? body.error : undefined,
				code: typeof body.code === 'string' ? body.code : undefined,
				detectedSource: typeof body.detectedSource === 'string' ? body.detectedSource : undefined,
			};
		}
	} catch {
		return {};
	}
	return {};
};

const mapFunctionError = (body: FunctionErrorBody): string => {
	if (body.code === 'DETECTED_PLATFORM') {
		return DICT.ICAL.ERRORS.DETECTED_PLATFORM.replaceAll('{platform}', body.detectedSource ?? '');
	}
	const message = body.code ? FUNCTION_ERROR_MESSAGES[body.code] : undefined;
	return message ?? body.error ?? DICT.ERRORS.COMMON.GENERIC;
};

const getAuthToken = async (): Promise<string | null> => {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session?.access_token ?? null;
};

const invokeFeedFunction = async <T>(
	route: string,
	options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; signal?: AbortSignal },
): Promise<ActionResult<T>> => {
	const token = await getAuthToken();
	if (!token) {
		return { data: null, error: 'Not authenticated' };
	}

	const { data, error } = await supabase.functions.invoke<T>(`${FUNCTION_NAME}${route}`, {
		method: options?.method ?? 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: options?.body,
		signal: options?.signal,
	});

	if (error) {
		const body = await readErrorBody(error);
		return { data: null, error: mapFunctionError(body) };
	}

	return { data: data ?? null, error: null };
};

export const icalService = {
	async getFeeds(signal?: AbortSignal): Promise<ActionResult<IcalFeed[]>> {
		const result = await invokeFeedFunction<FeedListResponse>('/feeds', {
			method: 'GET',
			signal,
		});
		if (result.error) {
			return { data: null, error: result.error };
		}
		const feeds = (result.data?.data ?? []).filter((feed): feed is IcalFeed => isFeedObject(feed));
		return { data: feeds, error: null };
	},

	async createFeed(payload: CreateFeedPayload): Promise<ActionResult<IcalFeed>> {
		const result = await invokeFeedFunction<FeedResponse>('/create', { body: payload });
		if (result.error) {
			return { data: null, error: result.error };
		}
		const feed = isFeedObject(result.data?.data) ? result.data.data : null;
		return { data: feed, error: null };
	},

	async deleteFeed(payload: DeleteFeedPayload): Promise<{ error: string | null }> {
		const result = await invokeFeedFunction<{ data: { id: string } }>('/delete', { body: payload });
		return { error: result.error };
	},

	async syncFeed(feedId: string): Promise<{ error: string | null }> {
		const result = await invokeFeedFunction<{ data: { queued: boolean; feedId: string } }>(
			'/sync',
			{
				body: { feedId },
			},
		);
		return { error: result.error };
	},

	async updateFeed(payload: UpdateFeedPayload): Promise<ActionResult<IcalFeed>> {
		const result = await invokeFeedFunction<FeedResponse>('/update', { body: payload });
		if (result.error) {
			return { data: null, error: result.error };
		}
		const feed = isFeedObject(result.data?.data) ? result.data.data : null;
		return { data: feed, error: null };
	},
};
