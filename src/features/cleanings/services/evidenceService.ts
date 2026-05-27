'use client';

import type { EvidenceInsert } from '@/features/cleanings/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const evidenceService = {
	async insertEvidence(payload: EvidenceInsert): Promise<ActionResult<void>> {
		const { error } = await supabase.from('evidence_media').insert(payload);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async softDeleteEvidence(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('soft_delete_evidence_media', {
			p_evidence_id: id,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async hardDeleteEvidence(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.from('evidence_media').delete().eq('id', id);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},
};
