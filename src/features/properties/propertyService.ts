import type { Property, PropertyInsert } from '@/features/properties/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const propertyService = {
	async getProperties(signal?: AbortSignal): Promise<ActionResult<Property[]>> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { data: [], error: 'Not authenticated' };
		}

		let query = supabase.from('properties').select('*').eq('host_id', user.id);

		if (signal) {
			query = query.abortSignal(signal);
		}

		const { data, error } = await query
			.order('created_at', { ascending: false })
			.order('id', { ascending: false });

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data, error: null };
	},

	async getPropertyById(id: string): Promise<ActionResult<Property>> {
		const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data, error: null };
	},

	async upsertProperty(property: PropertyInsert): Promise<ActionResult<Property>> {
		const { data, error } = await supabase.from('properties').upsert(property).select().single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data, error: null };
	},

	async softDeleteProperty(id: string): Promise<{ error: string | null }> {
		const { error } = await supabase.rpc('soft_delete_property', {
			p_property_id: id,
		});

		if (error) {
			return { error: mapDatabaseError(error) };
		}

		return { error: null };
	},

	async hardDeleteProperty(id: string): Promise<{ error: string | null }> {
		const { error } = await supabase.from('properties').delete().eq('id', id);

		if (error) {
			return { error: mapDatabaseError(error) };
		}

		return { error: null };
	},
};
