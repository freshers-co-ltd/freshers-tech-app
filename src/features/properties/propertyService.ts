import type { Database } from '@/lib/database.types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];
export type PropertyType = Database['public']['Enums']['property_type'];

export const propertyService = {
	async getProperties(): Promise<ActionResult<Property[]>> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		console.log('[propertyService.getProperties] Current user:', user?.id, 'email:', user?.email);

		if (!user) {
			console.log('[propertyService.getProperties] NOT AUTHENTICATED - returning empty');
			return { data: [], error: 'Not authenticated' };
		}

		console.log('[propertyService.getProperties] Fetching properties for host_id:', user.id);

		const { data, error } = await supabase
			.from('properties')
			.select('*')
			.eq('host_id', user.id)
			.order('created_at', { ascending: false });

		console.log('[propertyService.getProperties] Query result for host_id:', user.id, {
			dataCount: data?.length,
			error: error?.message,
		});

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

	async deleteProperty(id: string): Promise<{ error: string | null }> {
		const { error } = await supabase.from('properties').delete().eq('id', id);

		if (error) {
			return { error: mapDatabaseError(error) };
		}

		return { error: null };
	},
};
