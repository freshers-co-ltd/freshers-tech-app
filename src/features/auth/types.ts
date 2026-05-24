import type { Database } from '@/lib/database.types';

export type UserRole = Database['public']['Enums']['user_role'];

export interface Profile {
	id: string;
	email: string;
	role: UserRole;
	full_name: string;
	avatar_url: string | null;
	is_verified: boolean;
}

export interface AuthActionResult {
	error: string | null;
	user?: import('@supabase/supabase-js').User | null;
	needsConfirmation?: boolean;
}
