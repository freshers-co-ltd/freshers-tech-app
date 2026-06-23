'use client';

import type { Json } from '@/lib/database.types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const pushSubscriptionsService = {
	async insert(userId: string, subscription: Json): Promise<ActionResult<void>> {
		const { error } = await supabase.from('push_subscriptions').insert({
			user_id: userId,
			subscription,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async deleteByEndpoint(endpoint: string): Promise<ActionResult<void>> {
		const { error } = await supabase
			.from('push_subscriptions')
			.delete()
			.eq('subscription->>endpoint', endpoint);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async deleteByUserId(userId: string): Promise<ActionResult<void>> {
		const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async hasSubscription(userId: string): Promise<ActionResult<boolean>> {
		const { data, error } = await supabase
			.from('push_subscriptions')
			.select('id')
			.eq('user_id', userId)
			.maybeSingle();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: !!data, error: null };
	},

	async getByUserId(userId: string): Promise<ActionResult<{ subscription: Json } | null>> {
		const { data, error } = await supabase
			.from('push_subscriptions')
			.select('subscription')
			.eq('user_id', userId)
			.maybeSingle();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data ?? null, error: null };
	},
};
