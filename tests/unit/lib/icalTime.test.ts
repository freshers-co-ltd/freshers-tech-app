import { describe, expect, it } from 'vitest';
import {
	extractCheckoutDate,
	extractCheckoutTime,
	formatIsoDate,
	parseClockTime,
} from '../../../supabase/functions/_shared/time.ts';

describe('extractCheckoutTime', () => {
	it('parses a colon-separated checkout time', () => {
		expect(extractCheckoutTime('CHECKOUT: 11:00')).toEqual({ hour: 11, minute: 0 });
	});

	it('parses a checkout time with an AM/PM suffix', () => {
		expect(extractCheckoutTime('CHECKOUT: 11:00 AM')).toEqual({ hour: 11, minute: 0 });
	});

	it('parses a hyphenated check-out key', () => {
		expect(extractCheckoutTime('Check-out: 10:30')).toEqual({ hour: 10, minute: 30 });
	});

	it('ignores slash-separated checkout dates', () => {
		const description = 'CHECKIN: 18/09/2026\nCHECKOUT: 21/09/2026\nNIGHTS: 3\nGUESTS: 2';
		expect(extractCheckoutTime(description)).toBeNull();
	});

	it('ignores dot-separated checkout dates', () => {
		const description = 'CHECKIN: 18/09/2026\nCHECKOUT: 21.09.2026\nNIGHTS: 3\nGUESTS: 2';
		expect(extractCheckoutTime(description)).toBeNull();
	});

	it('ignores ISO checkout dates', () => {
		expect(extractCheckoutTime('CHECKOUT: 2026-09-21')).toBeNull();
	});

	it('returns null for null or empty descriptions', () => {
		expect(extractCheckoutTime(null)).toBeNull();
		expect(extractCheckoutTime('')).toBeNull();
	});
});

describe('extractCheckoutDate', () => {
	it('parses an ISO checkout date', () => {
		expect(extractCheckoutDate('CHECKOUT: 2026-09-21')).toEqual({ year: 2026, month: 9, day: 21 });
	});

	it('ignores slash-separated checkout dates', () => {
		expect(extractCheckoutDate('CHECKOUT: 21/09/2026')).toBeNull();
	});

	it('rejects out-of-range months', () => {
		expect(extractCheckoutDate('CHECKOUT: 2026-13-01')).toBeNull();
	});
});

describe('parseClockTime', () => {
	it('parses an HH:mm:ss clock value', () => {
		expect(parseClockTime('11:00:00')).toEqual({ hour: 11, minute: 0 });
	});
});

describe('formatIsoDate', () => {
	it('formats year, month and day with zero padding', () => {
		expect(formatIsoDate({ year: 2026, month: 9, day: 5 })).toBe('2026-09-05');
	});
});
