// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

		const authHeader = req.headers.get('Authorization') ?? '';
		console.log('[DEBUG] Authorization Header Received:', authHeader);

		const supabaseClient = createClient(
			supabaseUrl,
			supabaseAnonKey,
			{ global: { headers: { Authorization: authHeader } } }
		)

		const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
		console.log('[DEBUG] Decoded User:', user);
		console.log('[DEBUG] User app_metadata:', user?.app_metadata);

		if (authError || user?.app_metadata?.role !== 'admin') {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			})
		}

const adminClient = createClient(supabaseUrl, serviceRoleKey)

		const { email, role, full_name } = await req.json()
		
		console.log('[DEBUG] Invite Input:', { email, role, full_name });
		console.log('[DEBUG] Using service role key:', serviceRoleKey ? 'yes' : 'no');

		const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
			data: { role, full_name },
			redirectTo: `${new URL(req.url).origin}/set-password`
		})

		console.log('[DEBUG] Invite Result:', JSON.stringify(data));
		console.log('[DEBUG] Invite Full Error:', JSON.stringify(inviteError));

		return new Response(JSON.stringify({ data }), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		})
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		})
	}
})