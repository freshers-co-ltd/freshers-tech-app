import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	deriveEndDate,
	type IcalRawEvent,
	parseIcs,
	utcToZonedDate,
	zonedToUtc,
} from '../../../supabase/functions/_shared/ical.ts';
import { classifyEvent, getDialect } from '../../../supabase/functions/_shared/platform.ts';
import { computeScheduledStart } from '../../../supabase/functions/ical-sync/sync.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../../fixtures/ical');

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES_DIR, `${name}/calendar.ics`), 'utf-8');
}

function findEvent(events: IcalRawEvent[], uid: string): IcalRawEvent {
	const event = events.find((e) => e.uid === uid);
	expect(event, `expected event ${uid} to exist`).toBeDefined();
	if (!event) {
		throw new Error(`Event ${uid} not found`);
	}
	return event;
}

describe('parseIcs', () => {
	it('parses Airbnb fixture into IcalRawEvent[]', () => {
		const result = parseIcs(readFixture('airbnb'));
		expect(result.events.length).toBeGreaterThanOrEqual(2);
		const first = result.events[0];
		expect(first.uid).toBe('booking-1001@airbnb');
		expect(first.dtstart).toMatchObject({
			year: 2026,
			month: 9,
			day: 18,
			isDate: true,
		});
		expect(first.dtend).toMatchObject({
			year: 2026,
			month: 9,
			day: 21,
			isDate: true,
		});
		expect(first.description).toContain('CHECKOUT');
	});

	it('parses Booking.com fixture', () => {
		const result = parseIcs(readFixture('booking.com'));
		expect(result.events.length).toBe(2);
		expect(result.prodid).toContain('Booking.com');
		expect(result.events[0].uid).toBe('booking-5001@booking.com');
		expect(result.events[0].dtstart).toMatchObject({
			year: 2026,
			month: 9,
			day: 10,
			isDate: true,
		});
	});

	it('parses VRBO fixture', () => {
		const result = parseIcs(readFixture('vrbo'));
		expect(result.events.length).toBe(2);
		expect(result.prodid).toContain('VRBO');
		expect(result.events[0].uid).toBe('res-6001');
	});

	it('parses generic fixture', () => {
		const result = parseIcs(readFixture('generic'));
		expect(result.events.length).toBe(2);
		expect(result.events[0].uid).toBe('booking-7001@example.com');
	});

	it('filters out events with empty UIDs', () => {
		const result = parseIcs(readFixture('generic'));
		for (const event of result.events) {
			expect(event.uid).not.toBe('');
		}
	});
});

describe('classifyEvent', () => {
	it('classifies Airbnb booking', () => {
		const dialect = getDialect('airbnb');
		const result = parseIcs(readFixture('airbnb'));
		const booking = findEvent(result.events, 'booking-1001@airbnb');
		expect(classifyEvent(dialect, booking)).toEqual({ kind: 'booking', confidence: 'high' });
	});

	it('classifies Airbnb block (Not available)', () => {
		const dialect = getDialect('airbnb');
		const result = parseIcs(readFixture('airbnb'));
		const block = findEvent(result.events, 'block-1002@airbnb');
		expect(classifyEvent(dialect, block)).toEqual({ kind: 'block' });
	});

	it('classifies Airbnb tentative', () => {
		const dialect = getDialect('airbnb');
		const result = parseIcs(readFixture('airbnb'));
		const tentative = findEvent(result.events, 'tentative-1004@airbnb');
		expect(classifyEvent(dialect, tentative)).toEqual({ kind: 'tentative' });
	});

	it('classifies Booking.com booking (Closed - Not available)', () => {
		const dialect = getDialect('booking');
		const result = parseIcs(readFixture('booking.com'));
		const booking = findEvent(result.events, 'booking-5001@booking.com');
		expect(classifyEvent(dialect, booking)).toEqual({ kind: 'booking', confidence: 'high' });
	});

	it('classifies Booking.com block', () => {
		const dialect = getDialect('booking');
		const result = parseIcs(readFixture('booking.com'));
		const block = findEvent(result.events, 'block-5002@booking.com');
		expect(classifyEvent(dialect, block)).toEqual({ kind: 'block' });
	});

	it('classifies VRBO reservation', () => {
		const dialect = getDialect('vrbo');
		const result = parseIcs(readFixture('vrbo'));
		const booking = findEvent(result.events, 'res-6001');
		expect(classifyEvent(dialect, booking)).toEqual({ kind: 'booking', confidence: 'high' });
	});

	it('classifies VRBO block (Owner stay)', () => {
		const dialect = getDialect('vrbo');
		const result = parseIcs(readFixture('vrbo'));
		const block = findEvent(result.events, 'blk-6002');
		expect(classifyEvent(dialect, block)).toEqual({ kind: 'block' });
	});

	it('classifies generic booking', () => {
		const dialect = getDialect('generic');
		const result = parseIcs(readFixture('generic'));
		const booking = findEvent(result.events, 'booking-7001@example.com');
		expect(classifyEvent(dialect, booking)).toEqual({ kind: 'booking', confidence: 'low' });
	});

	it('classifies generic block (Maintenance)', () => {
		const dialect = getDialect('generic');
		const result = parseIcs(readFixture('generic'));
		const block = findEvent(result.events, 'block-7002@example.com');
		expect(classifyEvent(dialect, block)).toEqual({ kind: 'block' });
	});
});

describe('DATE vs DATETIME handling', () => {
	it('marks DATE-only events with isDate: true and null hour/minute', () => {
		const result = parseIcs(readFixture('airbnb'));
		const event = result.events[0];
		expect(event.dtstart?.isDate).toBe(true);
		expect(event.dtstart?.hour).toBeNull();
		expect(event.dtstart?.minute).toBeNull();
	});

	it('deriveEndDate uses DESCRIPTION CHECKOUT date when DTEND missing', () => {
		const event: IcalRawEvent = {
			uid: 'test-checkout',
			summary: 'Test',
			description: 'CHECKOUT: 2026-09-21',
			dtstart: {
				year: 2026,
				month: 9,
				day: 18,
				hour: null,
				minute: null,
				isDate: true,
				tzid: null,
				isUtc: false,
			},
			dtend: null,
		};
		const derived = deriveEndDate(event);
		expect(derived.dtend).toMatchObject({
			year: 2026,
			month: 9,
			day: 21,
			isDate: true,
		});
	});

	it('deriveEndDate falls back to start + 1 day without CHECKOUT', () => {
		const event: IcalRawEvent = {
			uid: 'test-fallback',
			summary: 'Test',
			description: 'No checkout info',
			dtstart: {
				year: 2026,
				month: 9,
				day: 18,
				hour: null,
				minute: null,
				isDate: true,
				tzid: null,
				isUtc: false,
			},
			dtend: null,
		};
		const derived = deriveEndDate(event);
		expect(derived.dtend).toMatchObject({
			year: 2026,
			month: 9,
			day: 19,
			isDate: true,
		});
	});

	it('deriveEndDate returns event unchanged when DTEND present', () => {
		const event: IcalRawEvent = {
			uid: 'test-existing',
			summary: 'Test',
			description: null,
			dtstart: {
				year: 2026,
				month: 9,
				day: 18,
				hour: null,
				minute: null,
				isDate: true,
				tzid: null,
				isUtc: false,
			},
			dtend: {
				year: 2026,
				month: 9,
				day: 21,
				hour: null,
				minute: null,
				isDate: true,
				tzid: null,
				isUtc: false,
			},
		};
		const derived = deriveEndDate(event);
		expect(derived.dtend).toMatchObject({
			year: 2026,
			month: 9,
			day: 21,
			isDate: true,
		});
	});
});

describe('Timezone round-trips', () => {
	it('zonedToUtc/utcToZonedDate round-trip for Europe/London winter', () => {
		const zone = 'Europe/London';
		const instant = zonedToUtc(zone, 2026, 1, 15, 11, 0);
		const back = utcToZonedDate(instant, zone);
		expect(back).toMatchObject({ year: 2026, month: 1, day: 15 });
	});

	it('zonedToUtc/utcToZonedDate round-trip for Europe/London BST', () => {
		const zone = 'Europe/London';
		const instant = zonedToUtc(zone, 2026, 7, 15, 11, 0);
		const back = utcToZonedDate(instant, zone);
		expect(back).toMatchObject({ year: 2026, month: 7, day: 15 });
	});

	it('zonedToUtc produces a valid UTC timestamp', () => {
		const instant = zonedToUtc('Europe/London', 2026, 3, 29, 1, 0);
		expect(Number.isFinite(instant)).toBe(true);
		expect(instant).toBeGreaterThan(0);
	});
});

describe('computeScheduledStart', () => {
	const baseProperty = {
		hostId: 'host-1',
		timezone: 'Europe/London',
		defaultCleaningTime: '11:00:00',
		pricePerCleaning: null,
		address: '123 Test St',
	};

	it('timed checkout → checkout time in end.tzid', () => {
		const event: IcalRawEvent = {
			uid: 'timed-1',
			summary: 'Test',
			description: 'CHECKOUT: 10:00',
			dtstart: {
				year: 2026,
				month: 9,
				day: 18,
				hour: 15,
				minute: 0,
				isDate: false,
				tzid: 'Europe/London',
				isUtc: false,
			},
			dtend: {
				year: 2026,
				month: 9,
				day: 21,
				hour: 10,
				minute: 0,
				isDate: false,
				tzid: 'Europe/London',
				isUtc: false,
			},
		};
		const result = computeScheduledStart(event, baseProperty);
		const expectedUtc = zonedToUtc('Europe/London', 2026, 9, 21, 10, 0);
		expect(new Date(result).getTime()).toBe(expectedUtc);
	});

	it('date-only → default_cleaning_time in property tz', () => {
		const event: IcalRawEvent = {
			uid: 'date-1',
			summary: 'Test',
			description: null,
			dtstart: {
				year: 2026,
				month: 9,
				day: 18,
				hour: null,
				minute: null,
				isDate: true,
				tzid: null,
				isUtc: false,
			},
			dtend: {
				year: 2026,
				month: 9,
				day: 21,
				hour: null,
				minute: null,
				isDate: true,
				tzid: null,
				isUtc: false,
			},
		};
		const result = computeScheduledStart(event, baseProperty);
		const expectedUtc = zonedToUtc('Europe/London', 2026, 9, 21, 11, 0);
		expect(new Date(result).getTime()).toBe(expectedUtc);
	});

	it('timed event without tzid uses property timezone', () => {
		const event: IcalRawEvent = {
			uid: 'timed-notz',
			summary: 'Test',
			description: null,
			dtstart: {
				year: 2026,
				month: 9,
				day: 18,
				hour: 15,
				minute: 0,
				isDate: false,
				tzid: null,
				isUtc: false,
			},
			dtend: {
				year: 2026,
				month: 9,
				day: 21,
				hour: 9,
				minute: 0,
				isDate: false,
				tzid: null,
				isUtc: false,
			},
		};
		const result = computeScheduledStart(event, baseProperty);
		const expectedUtc = zonedToUtc('Europe/London', 2026, 9, 21, 11, 0);
		expect(new Date(result).getTime()).toBe(expectedUtc);
	});
});
