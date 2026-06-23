'use client';

import type { ReportInsert } from '@/features/cleanings/types';
import type { Database } from '@/lib/database.types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const reportsService = {
	async upsertReport(
		payload: ReportInsert,
	): Promise<ActionResult<Database['public']['Tables']['cleaning_reports']['Row']>> {
		const { data, error } = await supabase
			.from('cleaning_reports')
			.upsert(payload)
			.select()
			.single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data, error: null };
	},

	async softDeleteReport(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('soft_delete_cleaning_report', {
			p_report_id: id,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},
};
