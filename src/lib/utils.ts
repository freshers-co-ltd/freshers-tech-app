import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type DateFormatVariant = 'short' | 'long' | 'time' | 'datetime' | 'numeric';

interface FormatDateOptions {
	variant?: DateFormatVariant;
	locale?: string;
}

export function formatDate(date: Date | string, options: FormatDateOptions = {}): string {
	const { variant = 'short', locale = 'en-GB' } = options;
	const dateObj = typeof date === 'string' ? new Date(date) : date;

	if (Number.isNaN(dateObj.getTime())) {
		return '-';
	}

	switch (variant) {
		case 'numeric':
			return dateObj.toLocaleDateString(locale, {
				day: '2-digit',
				month: '2-digit',
				year: '2-digit',
			});
		case 'short':
			return dateObj.toLocaleDateString(locale, {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			});
		case 'long':
			return dateObj.toLocaleDateString(locale, {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});
		case 'time':
			return dateObj.toLocaleTimeString(locale, {
				hour: '2-digit',
				minute: '2-digit',
			});
		case 'datetime':
			return `${formatDate(dateObj, { variant: 'short' })} ${formatDate(dateObj, { variant: 'time' })}`;
		default:
			return dateObj.toLocaleDateString();
	}
}

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export function formatPostcode(postcode: string): string {
	return postcode.toUpperCase().replace(/^(.{3,4})/, '$1 ');
}

export function formatHours(hours: number, isShort: boolean = false): string {
	if (hours < 1) {
		const suffix = isShort ? 'm' : ' mins';
		return `${Math.round(hours * 60)} ${suffix}`;
	}

	const suffix = isShort ? 'h' : ' hours';
	return `${hours.toFixed(1)} ${suffix}`;
}
