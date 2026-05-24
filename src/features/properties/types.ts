import type { Database } from '@/lib/database.types';

export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyType = Database['public']['Enums']['property_type'];

export const propertyTypeValues = [
	'house',
	'apartment',
	'studio',
] as const satisfies readonly PropertyType[];
