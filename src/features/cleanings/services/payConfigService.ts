'use client';

import type { CleanerPayConfig } from '@/features/cleanings/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const payConfigService = {
	async getCleanerPayConfig(): Promise<ActionResult<CleanerPayConfig>> {
		const { data, error } = await supabase.rpc('get_cleaner_pay_config');
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		if (!data || data.length === 0) {
			return { data: null, error: 'No config found' };
		}
		const config = data[0] as unknown as CleanerPayConfig;
		return {
			data: { ...config, bathroom_time: config.bathroom_time ?? 0.5 },
			error: null,
		};
	},

	async updateCleanerPayConfig(config: CleanerPayConfig): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('update_cleaner_pay_config', {
			p_hourly_rate: config.hourly_rate,
			p_target_times: config.target_times,
			p_bathroom_time: config.bathroom_time,
		});
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},
};
