import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateCalendarSource } from '../../../supabase/functions/_shared/platform.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../../fixtures/ical');

function readFixture(name: string): string {
	return readFileSync(resolve(FIXTURES_DIR, `${name}/calendar.ics`), 'utf-8');
}

function makeFetchIcs(body: string) {
	return async (_url: string) => ({ status: 'ok' as const, body });
}

function makeErrorFetch() {
	return async (_url: string) => ({ status: 'error' as const, error: 'Network error' });
}

describe('validateCalendarSource', () => {
	it('accepts valid Airbnb calendar', async () => {
		const result = await validateCalendarSource({
			url: 'https://www.airbnb.com/calendar/ical/12345.ics',
			source: 'airbnb',
			fetchIcs: makeFetchIcs(readFixture('airbnb')),
		});
		expect(result.ok).toBe(true);
	});

	it('accepts valid Booking.com calendar', async () => {
		const result = await validateCalendarSource({
			url: 'https://www.booking.com/calendar/ical/12345.ics',
			source: 'booking',
			fetchIcs: makeFetchIcs(readFixture('booking.com')),
		});
		expect(result.ok).toBe(true);
	});

	it('accepts valid VRBO calendar', async () => {
		const result = await validateCalendarSource({
			url: 'https://www.vrbo.com/calendar/ical/12345.ics',
			source: 'vrbo',
			fetchIcs: makeFetchIcs(readFixture('vrbo')),
		});
		expect(result.ok).toBe(true);
	});

	it('accepts generic calendar with confirmGeneric', async () => {
		const result = await validateCalendarSource({
			url: 'https://example.com/calendar.ics',
			source: 'generic',
			confirmGeneric: true,
			fetchIcs: makeFetchIcs(readFixture('generic')),
		});
		expect(result.ok).toBe(true);
	});

	it('rejects Google/personal calendar even with confirmGeneric', async () => {
		const result = await validateCalendarSource({
			url: 'https://calendar.google.com/calendar/ical/abc.ics',
			source: 'generic',
			confirmGeneric: true,
			fetchIcs: makeFetchIcs(readFixture('personal')),
		});
		expect(result.ok).toBe(false);
		expect(result.code).toBe('PERSONAL_CALENDAR');
	});

	it('rejects personal calendar without confirmation', async () => {
		const result = await validateCalendarSource({
			url: 'https://calendar.google.com/calendar/ical/abc.ics',
			source: 'generic',
			fetchIcs: makeFetchIcs(readFixture('personal')),
		});
		expect(result.ok).toBe(false);
		expect(result.code).toBe('PERSONAL_CALENDAR');
	});

	it('rejects on fetch error', async () => {
		const result = await validateCalendarSource({
			url: 'https://example.com/broken.ics',
			source: 'generic',
			fetchIcs: makeErrorFetch(),
		});
		expect(result.ok).toBe(false);
		expect(result.code).toBe('FETCH_FAILED');
	});

	it('rejects platform mismatch (Airbnb calendar as Booking)', async () => {
		const result = await validateCalendarSource({
			url: 'https://www.booking.com/calendar/ical/12345.ics',
			source: 'booking',
			fetchIcs: makeFetchIcs(readFixture('airbnb')),
		});
		expect(result.ok).toBe(false);
		expect(result.code).toBe('PLATFORM_MISMATCH');
	});

	it('rejects generic without confirmation when a platform is detected', async () => {
		const result = await validateCalendarSource({
			url: 'https://www.airbnb.com/calendar/ical/12345.ics',
			source: 'generic',
			fetchIcs: makeFetchIcs(readFixture('airbnb')),
		});
		expect(result.ok).toBe(false);
		expect(result.code).toBe('DETECTED_PLATFORM');
		expect(result.detectedSource).toBe('airbnb');
	});
});
