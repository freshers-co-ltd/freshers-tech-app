// @ts-nocheck
import { parseIcs, type IcalRawEvent, type ParseIcsResult } from './ical.ts';

export type IcalSource = 'airbnb' | 'booking' | 'vrbo' | 'generic';

export interface PlatformDialect {
	urlHostPatterns: RegExp[];
	prodidPatterns: RegExp[];
	blockSummaryPatterns: RegExp[];
	tentativePatterns: RegExp[];
	uidPrefixes: { booking: RegExp; block: RegExp };
	bookingDescriptionPatterns: RegExp[];
	lowConfidence: boolean;
}

export interface EventClassification {
	kind: 'booking' | 'block' | 'tentative';
	confidence?: 'high' | 'low';
}

export interface FetchIcsLike {
	(url: string): Promise<{ status: 'ok'; body: string } | { status: 'error'; error: string }>;
}

export interface CalendarValidationResult {
	ok: boolean;
	code?: 'FETCH_FAILED' | 'INVALID_CALENDAR' | 'PERSONAL_CALENDAR' | 'PLATFORM_MISMATCH' | 'DETECTED_PLATFORM';
	message?: string;
	detectedSource?: IcalSource;
}

const PERSONAL_CALENDAR_PATTERNS = [/google calendar/i, /apple inc/i, /microsoft/i, /outlook/i, /yahoo/i];

const AIRBNB_DIALECT: PlatformDialect = {
	urlHostPatterns: [/airbnb/i],
	prodidPatterns: [/airbnb/i],
	blockSummaryPatterns: [/^block/i, /-block@/i, /not available/i],
	tentativePatterns: [/tentative/i],
	uidPrefixes: { booking: /$^/, block: /-block@/i },
	bookingDescriptionPatterns: [/check[\s_-]*in/i, /check[\s_-]*out/i, /reservation/i],
	lowConfidence: false,
};

const BOOKING_DIALECT: PlatformDialect = {
	urlHostPatterns: [/booking\.com/i],
	prodidPatterns: [/booking/i],
	blockSummaryPatterns: [/^block/i, /-block@/i],
	tentativePatterns: [],
	uidPrefixes: { booking: /$^/, block: /-block@/i },
	bookingDescriptionPatterns: [],
	lowConfidence: false,
};

const VRBO_DIALECT: PlatformDialect = {
	urlHostPatterns: [/vrbo/i],
	prodidPatterns: [/vrbo/i],
	blockSummaryPatterns: [/^block/i, /-block@/i, /owner stay/i],
	tentativePatterns: [/tentative/i],
	uidPrefixes: { booking: /^res-/i, block: /^blk-/i },
	bookingDescriptionPatterns: [],
	lowConfidence: false,
};

const GENERIC_DIALECT: PlatformDialect = {
	urlHostPatterns: [],
	prodidPatterns: [],
	blockSummaryPatterns: [/^block/i, /-block@/i, /maintenance/i, /not available/i, /closed/i, /owner stay/i],
	tentativePatterns: [/tentative/i],
	uidPrefixes: { booking: /$^/, block: /-block@/i },
	bookingDescriptionPatterns: [/maintenance/i, /owner stay/i, /not available/i, /blocked/i, /closed/i],
	lowConfidence: true,
};

const DIALECTS: Record<IcalSource, PlatformDialect> = {
	airbnb: AIRBNB_DIALECT,
	booking: BOOKING_DIALECT,
	vrbo: VRBO_DIALECT,
	generic: GENERIC_DIALECT,
};

export function isIcalSource(value: string): value is IcalSource {
	return value === 'airbnb' || value === 'booking' || value === 'vrbo' || value === 'generic';
}

export function getDialect(source: IcalSource): PlatformDialect {
	return DIALECTS[source];
}

export function classifyEvent(dialect: PlatformDialect, event: IcalRawEvent): EventClassification {
	const uid = event.uid;
	const summary = event.summary ?? '';
	const description = event.description ?? '';
	if (dialect.tentativePatterns.some((pattern) => pattern.test(uid) || pattern.test(summary))) {
		return { kind: 'tentative' };
	}
	if (dialect.uidPrefixes.block.test(uid)) {
		return { kind: 'block' };
	}
	if (dialect.blockSummaryPatterns.some((pattern) => pattern.test(uid) || pattern.test(summary))) {
		if (
			dialect.bookingDescriptionPatterns.length > 0 &&
			dialect.bookingDescriptionPatterns.some((pattern) => pattern.test(description))
		) {
			return { kind: 'booking', confidence: dialect.lowConfidence ? 'low' : 'high' };
		}
		return { kind: 'block' };
	}
	return { kind: 'booking', confidence: dialect.lowConfidence ? 'low' : 'high' };
}

export function detectPlatformFromUrl(url: string): IcalSource {
	if (/airbnb/i.test(url)) return 'airbnb';
	if (/booking\.com/i.test(url)) return 'booking';
	if (/vrbo/i.test(url)) return 'vrbo';
	return 'generic';
}

export function detectPlatformFromProdid(prodid: string): IcalSource {
	if (/airbnb/i.test(prodid)) return 'airbnb';
	if (/booking/i.test(prodid)) return 'booking';
	if (/vrbo/i.test(prodid)) return 'vrbo';
	return 'generic';
}

export function normalizeIcalUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Empty URL');
	const url = new URL(trimmed);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Unsupported protocol');
	}
	url.hostname = url.hostname.toLowerCase();
	url.hash = '';
	if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
		url.port = '';
	}
	if (url.pathname !== '/') {
		url.pathname = url.pathname.replace(/\/+$/, '');
	}
	return url.toString();
}

export async function hashIcalUrl(url: string): Promise<string> {
	const data = new TextEncoder().encode(url);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export function maskIcalUrl(url: string): string {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname;
		const lastSlash = path.lastIndexOf('/');
		const directory = lastSlash > 0 ? path.slice(0, lastSlash + 1) : '';
		const file = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
		const base = file.replace(/\.ics$/i, '');
		const tail = base.length >= 4 ? base.slice(-4) : base;
		return `${parsed.protocol}//${parsed.host}${directory}••••${tail}`;
	} catch {
		return '••••';
	}
}

export async function validateCalendarSource(options: {
	url: string;
	source: IcalSource;
	confirmGeneric?: boolean;
	fetchIcs: FetchIcsLike;
}): Promise<CalendarValidationResult> {
	const fetched = await options.fetchIcs(options.url);
	if (fetched.status === 'error') {
		return {
			ok: false,
			code: 'FETCH_FAILED',
			message: 'Could not fetch the calendar. Please check the link.',
		};
	}
	let parsed: ParseIcsResult;
	try {
		parsed = parseIcs(fetched.body);
	} catch {
		return { ok: false, code: 'INVALID_CALENDAR', message: 'The calendar link returned invalid data.' };
	}
	const prodid = parsed.prodid ?? '';
	if (PERSONAL_CALENDAR_PATTERNS.some((pattern) => pattern.test(prodid))) {
		return {
			ok: false,
			code: 'PERSONAL_CALENDAR',
			message: 'Personal calendars are not supported. Use a booking platform calendar link.',
		};
	}
	const detectedFromProdid = detectPlatformFromProdid(prodid);
	const detected = detectedFromProdid !== 'generic' ? detectedFromProdid : detectPlatformFromUrl(options.url);
	if (options.source === 'generic') {
		if (detected !== 'generic' && !options.confirmGeneric) {
			return {
				ok: false,
				code: 'DETECTED_PLATFORM',
				message: `This looks like an ${detected} calendar.`,
				detectedSource: detected,
			};
		}
		return { ok: true };
	}
	const dialect = getDialect(options.source);
	const urlMatches =
		dialect.urlHostPatterns.length === 0 || dialect.urlHostPatterns.some((pattern) => pattern.test(options.url));
	const prodidMatches =
		prodid === '' || dialect.prodidPatterns.length === 0 || dialect.prodidPatterns.some((pattern) => pattern.test(prodid));
	if (!urlMatches || !prodidMatches) {
		return {
			ok: false,
			code: 'PLATFORM_MISMATCH',
			message: "This calendar doesn't match the selected platform.",
			detectedSource: detected === options.source ? undefined : detected,
		};
	}
	return { ok: true };
}