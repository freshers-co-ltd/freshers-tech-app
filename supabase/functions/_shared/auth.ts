// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthUser {
	userId: string;
	role: string;
}

export async function authenticateRequest(
	req: Request,
	options: { supabaseUrl: string; anonKey: string },
): Promise<AuthUser | null> {
	const authHeader = req.headers.get('Authorization') ?? '';
	if (!authHeader) return null;
	const client = createClient(options.supabaseUrl, options.anonKey, {
		global: { headers: { Authorization: authHeader } },
	});
	const {
		data: { user },
	} = await client.auth.getUser();
	if (!user) return null;
	const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).single();
	if (!profile) return null;
	return { userId: user.id, role: profile.role };
}