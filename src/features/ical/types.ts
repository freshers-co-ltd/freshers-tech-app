import type { Database } from '@/lib/database.types';

export type IcalSource = 'airbnb' | 'booking' | 'vrbo' | 'generic';

export const ICAL_SOURCES: readonly IcalSource[] = [
	'airbnb',
	'booking',
	'vrbo',
	'generic',
] as const;

export const isIcalSource = (value: unknown): value is IcalSource => {
	return typeof value === 'string' && ICAL_SOURCES.some((source) => source === value);
};

export type IcalFeed = Database['public']['Tables']['ical_feeds']['Row'] & {
	properties: { address_line_1: string | null; town_city: string | null } | null;
};

export type CreateFeedPayload = {
	propertyId: string;
	url: string;
	source: IcalSource;
	confirmGeneric: boolean;
};

export type DeleteFeedPayload = {
	feedId: string;
	cancelCleanings: boolean;
};
