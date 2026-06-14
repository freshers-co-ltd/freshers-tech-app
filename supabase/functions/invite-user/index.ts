// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const DEFAULT_ORIGIN = 'http://localhost:5173';

function getAllowedOrigin(req: Request): string {
	const allowed = Deno.env.get('CORS_ORIGIN') || DEFAULT_ORIGIN;
	const requestOrigin = req.headers.get('Origin');
	if (requestOrigin && allowed.split(',').some((o) => o.trim() === requestOrigin)) {
		return requestOrigin;
	}
	return allowed.split(',')[0]?.trim() || DEFAULT_ORIGIN;
}

function corsHeaders(origin: string): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Vary': 'Origin',
	};
}

serve(async (req: Request) => {
	const origin = getAllowedOrigin(req);

	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders(origin) });
	}

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

		const authHeader = req.headers.get('Authorization') ?? '';

		const supabaseClient = createClient(
			supabaseUrl,
			supabaseAnonKey,
			{ global: { headers: { Authorization: authHeader } } }
		)

		const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

		if (authError || user?.app_metadata?.role !== 'admin') {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		const adminClient = createClient(supabaseUrl, serviceRoleKey)

		const { email, role, full_name, origin: bodyOrigin } = await req.json()

		const redirectOrigin = bodyOrigin || req.headers.get('origin') || new URL(req.url).origin;
		const redirectTo = `${redirectOrigin}/set-password`;

		const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
			data: { role, full_name, password_set: false },
			redirectTo,
		})

		if (inviteError) {
			return new Response(JSON.stringify({ error: inviteError }), {
				status: 400,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		if (data?.user) {
			await adminClient.auth.admin.updateUserById(data.user.id, {
				app_metadata: { role, provider: 'email', providers: ['email'] },
				user_metadata: {
					sub: data.user.id,
					role,
					full_name,
					email_verified: false,
					password_set: false,
				},
			})
		}

		return new Response(JSON.stringify({ data }), {
			status: 200,
			headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
		})
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
		})
	}
})