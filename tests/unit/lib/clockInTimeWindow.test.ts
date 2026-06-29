import { describe, expect, it } from 'vitest';

function canClockIn(scheduledStart: Date, now: Date): boolean {
	const minClockInTime = new Date(scheduledStart.getTime() - 10 * 60_000);
	return now.toDateString() === scheduledStart.toDateString() && now >= minClockInTime;
}

function makeDate(year: number, month: number, day: number, hours: number, minutes: number): Date {
	return new Date(year, month, day, hours, minutes, 0, 0);
}

describe('canClockIn', () => {
	it('allows clock-in when now is inside the 10-minute window before start', () => {
		const scheduled = makeDate(2026, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 15, 9, 55);
		expect(canClockIn(scheduled, now)).toBe(true);
	});

	it('allows clock-in exactly at the minimum time (10 min before start)', () => {
		const scheduled = makeDate(2026, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 15, 9, 50);
		expect(canClockIn(scheduled, now)).toBe(true);
	});

	it('allows clock-in after the scheduled start time', () => {
		const scheduled = makeDate(2026, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 15, 14, 30);
		expect(canClockIn(scheduled, now)).toBe(true);
	});

	it('denies clock-in before the 10-minute window', () => {
		const scheduled = makeDate(2026, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 15, 9, 49);
		expect(canClockIn(scheduled, now)).toBe(false);
	});

	it('denies clock-in on a different day (previous day)', () => {
		const scheduled = makeDate(2026, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 14, 9, 55);
		expect(canClockIn(scheduled, now)).toBe(false);
	});

	it('denies clock-in on a different day (next day)', () => {
		const scheduled = makeDate(2026, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 16, 9, 55);
		expect(canClockIn(scheduled, now)).toBe(false);
	});

	it('denies clock-in on a different month with same day number', () => {
		const scheduled = makeDate(2026, 5, 15, 10, 0);
		const now = makeDate(2026, 6, 15, 9, 55);
		expect(canClockIn(scheduled, now)).toBe(false);
	});

	it('denies clock-in on a different year with same month and day', () => {
		const scheduled = makeDate(2025, 6, 15, 10, 0);
		const now = makeDate(2026, 6, 15, 9, 55);
		expect(canClockIn(scheduled, now)).toBe(false);
	});
});
