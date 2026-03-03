import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	if (import.meta.env.DEV) {
		console.warn(
			'Supabase credentials missing. Ensure you have a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
		);
	} else {
		console.error('Supabase environment variables are not defined.');
	}
}

export const supabase = createClient<Database>(
	supabaseUrl || 'https://placeholder-url.supabase.co',
	supabaseAnonKey || 'placeholder-key',
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
		},
	},
);
