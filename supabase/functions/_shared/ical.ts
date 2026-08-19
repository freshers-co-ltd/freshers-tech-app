// @ts-nocheck
import ICAL from 'npm:ical.js@2.2.1';

export interface IcalRawDate {
	year: number;
	month: number;
	day: number;
	hour: number | null;
	minute: number | null;
	isDate: boolean;
	tzid: string | null;
	isUtc: boolean;
}

export interface IcalRawEvent {
	uid: string;
	summary: string | null;
	description: string | null;
	dtstart: IcalRawDate | null;
	dtend: IcalRawDate | null;
}

export interface ParseIcsResult {
	prodid: string | null;
	events: IcalRawEvent[];
}

const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getFormatter(zone: string): Intl.DateTimeFormat {
	let formatter = FORMATTER_CACHE.get(zone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		});
		FORMATTER_CACHE.set(zone, formatter);
	}
	return formatter;
}

interface ZonedFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

function partsToFields(parts: Intl.DateTimeFormatPart[]): ZonedFields {
	const values: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			values[part.type] = part.value;
		}
	}
	return {
		year: Number(values.year),
		month: Number(values.month),
		day: Number(values.day),
		hour: Number(values.hour),
		minute: Number(values.minute),
		second: Number(values.second),
	};
}

export function utcToZonedDate(ms: number, zone: string): { year: number; month: number; day: number } {
	const fields = partsToFields(getFormatter(zone).formatToParts(new Date(ms)));
	return { year: fields.year, month: fields.month, day: fields.day };
}

export function zonedToUtc(
	zone: string,
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
): number {
	const target = Date.UTC(year, month - 1, day, hour, minute);
	const formatter = getFormatter(zone);
	let instant = target;
	for (let i = 0; i < 3; i++) {
		const fields = partsToFields(formatter.formatToParts(new Date(instant)));
		const local = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
		const delta = target - local;
		if (delta === 0) break;
		instant = target + delta;
	}
	return instant;
}

export function formatIsoDate(date: IcalRawDate): string {
	return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

export function wallDateToUtc(date: IcalRawDate): number {
	return Date.UTC(date.year, date.month - 1, date.day);
}

function pad2(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

export function parseClockTime(value: string): { hour: number; minute: number } {
	const parts = value.split(':').map((part) => Number(part));
	return { hour: parts[0] ?? 0, minute: parts[1] ?? 0 };
}

export function extractCheckoutTime(description: string | null): { hour: number; minute: number } | null {
	if (!description) return null;
	const match = description.match(/(?:check[\s_-]*out|checkout)\s*:?\s*(\d{1,2})[:.](\d{2})/i);
	if (!match) return null;
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
	return { hour, minute };
}

export function extractCheckoutDate(description: string | null): { year: number; month: number; day: number } | null {
	if (!description) return null;
	const match = description.match(/(?:check[\s_-]*out|checkout)\s*:?\s*(\d{4})-(\d{1,2})-(\d{1,2})/i);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
	return { year, month, day };
}

export function deriveEndDate(event: IcalRawEvent): IcalRawEvent {
	if (event.dtend || !event.dtstart) return event;
	const checkout = extractCheckoutDate(event.description);
	if (checkout) {
		return { ...event, dtend: { ...checkout, hour: null, minute: null, isDate: true, tzid: null, isUtc: false } };
	}
	const start = event.dtstart;
	const date = new Date(Date.UTC(start.year, start.month - 1, start.day));
	date.setUTCDate(date.getUTCDate() + 1);
	return {
		...event,
		dtend: {
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: null,
			minute: null,
			isDate: true,
			tzid: null,
			isUtc: false,
		},
	};
}

function toRawDate(property: ICAL.Property | undefined): IcalRawDate | null {
	if (!property) return null;
	const value = property.getFirstValue();
	if (!value || typeof value !== 'object') return null;
	const time = value as {
		isDate?: boolean;
		year?: number;
		month?: number;
		day?: number;
		hour?: number;
		minute?: number;
		zone?: { tzid?: string };
	};
	if (time.year === undefined || time.month === undefined || time.day === undefined) return null;
	const isDate = Boolean(time.isDate);
	const isUtc = (time.zone?.tzid ?? '') === 'UTC';
	const tzidParameter = property.getParameter('tzid');
	return {
		year: time.year,
		month: time.month,
		day: time.day,
		hour: isDate ? null : (time.hour ?? 0),
		minute: isDate ? null : (time.minute ?? 0),
		isDate,
		tzid: isUtc ? null : (typeof tzidParameter === 'string' ? tzidParameter : null),
		isUtc,
	};
}

function toRawEvent(component: ICAL.Component): IcalRawEvent {
	const uidProperty = component.getFirstProperty('uid');
	const uid = uidProperty ? String(uidProperty.getFirstValue() ?? '') : '';
	const summary = component.getFirstPropertyValue('summary');
	const description = component.getFirstPropertyValue('description');
	return {
		uid,
		summary: typeof summary === 'string' ? summary : null,
		description: typeof description === 'string' ? description : null,
		dtstart: toRawDate(component.getFirstProperty('dtstart')),
		dtend: toRawDate(component.getFirstProperty('dtend')),
	};
}

export function parseIcs(text: string): ParseIcsResult {
	const jcal = ICAL.parse(text);
	const root = new ICAL.Component(jcal);
	const prodidValue = root.getFirstPropertyValue('prodid');
	return {
		prodid: typeof prodidValue === 'string' ? prodidValue : null,
		events: root
			.getAllSubcomponents('vevent')
			.map(toRawEvent)
			.filter((event) => event.uid !== ''),
	};
}