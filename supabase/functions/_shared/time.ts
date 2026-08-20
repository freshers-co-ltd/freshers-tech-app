export function pad2(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

export function formatIsoDate(date: { year: number; month: number; day: number }): string {
	return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

export function parseClockTime(value: string): { hour: number; minute: number } {
	const parts = value.split(':').map((part) => Number(part));
	return { hour: parts[0] ?? 0, minute: parts[1] ?? 0 };
}

const CHECKOUT_TIME_PATTERN = /(?:check[\s_-]*out|checkout)\s*:?\s*(\d{1,2}):(\d{2})(?:\s*(?:AM|PM))?/i;

export function extractCheckoutTime(description: string | null): { hour: number; minute: number } | null {
	if (!description) return null;
	const match = description.match(CHECKOUT_TIME_PATTERN);
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