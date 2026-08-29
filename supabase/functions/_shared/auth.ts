// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AuthResult {
	userId: string;
	role: string;
	email: string;
}

export async function authenticateRequest(
	req: Request,
	config: { supabaseUrl: string; anonKey: string },
): Promise<AuthResult | null> {
	const authHeader = req.headers.get('Authorization');
	if (!authHeader) return null;

	const supabase = createClient(config.supabaseUrl, config.anonKey, {
		global: { headers: { Authorization: authHeader } },
	});

	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) return null;

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) return null;

	return {
		userId: user.id,
		role: profile.role,
		email: user.email || '',
	};
}
