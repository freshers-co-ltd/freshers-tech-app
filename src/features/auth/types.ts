import type { Database } from '@/lib/database.types';

export type UserRole = Database['public']['Enums']['user_role'];
export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

export interface Profile {
	id: string;
	email: string;
	role: UserRole;
	full_name: string;
	avatar_url: string | null;
	is_verified: boolean;
	is_invited: boolean;
	host_subscription_status: SubscriptionStatus | null;
}

export interface AuthActionResult {
	error: string | null;
	user?: import('@supabase/supabase-js').User | null;
	needsConfirmation?: boolean;
}

export interface MfaStatus {
	enrolled: boolean;
	verified: boolean;
}
