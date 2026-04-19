import type { PostgrestError } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';

export interface ActionResult<T> {
	data: T | null;
	error: string | null;
}

export const mapDatabaseError = (error: PostgrestError): string => {
	const errorMap: Record<string, string> = {
		PGRST116: 'Record not found or access denied.',
		'42501': 'You do not have permission to perform this action.',
		'23505': 'This record already exists.',
	};

	if (error.message?.includes('Failed to fetch')) {
		return DICT.ERRORS.COMMON.NETWORK;
	}
	return errorMap[error.code] || error.message || DICT.ERRORS.COMMON.GENERIC;
};
