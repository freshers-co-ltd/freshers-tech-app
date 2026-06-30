import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

function getAllowedOrigin(req: Request): string {
  const allowed = Deno.env.get('CORS_ORIGIN');
  const requestOrigin = req.headers.get('Origin');

  if (!requestOrigin) {
    return '*';
  }

  if (allowed) {
    const origins = allowed.split(',').map((o) => o.trim());
    if (origins.includes(requestOrigin)) {
      return requestOrigin;
    }
  }

  console.warn(`[invite-user] CORS: origin "${requestOrigin}" not in allowed list, echoing back`);
  return requestOrigin;
}

function corsHeaders(origin: string): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Vary': 'Origin',
	};
}

function errorJson(error: unknown): string {
  if (typeof error === 'string') return JSON.stringify({ error });
  if (error instanceof Error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ error: String(error) });
}

serve(async (req: Request) => {
	const origin = getAllowedOrigin(req);

	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders(origin) });
	}

	const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';
	if (!checkRateLimit(`invite:${clientIp}`, 5, 60_000)) {
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
		});
	}

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

		if (!supabaseUrl || !serviceRoleKey) {
			console.error('[Invite] Missing required env vars');
			return new Response(errorJson('Server configuration error'), {
				status: 500,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
			});
		}

		const authHeader = req.headers.get('Authorization') ?? '';

		const supabaseClient = createClient(
			supabaseUrl,
			supabaseAnonKey,
			{ global: { headers: { Authorization: authHeader } } }
		)

		const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

		if (authError || !user) {
			return new Response(errorJson('Unauthorized'), {
				status: 401,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		// Check admin role via profiles table (more reliable than JWT claims)
		const { data: profiles, error: profileError } = await supabaseClient
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single()

		if (profileError || !profiles) {
			console.error('[Invite] Failed to fetch caller profile:', profileError);
			return new Response(errorJson('Unauthorized'), {
				status: 401,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		const isAdmin = profiles.role === 'admin' || user?.app_metadata?.role === 'admin'

		if (!isAdmin) {
			console.warn(`[Invite] Non-admin user ${user.id} attempted to invite`);
			return new Response(errorJson('Forbidden'), {
				status: 403,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		const { email, role, full_name, origin: bodyOrigin } = await req.json()

		const redirectOrigin = bodyOrigin || req.headers.get('origin') || new URL(req.url).origin;
		const redirectTo = `${redirectOrigin}/set-password`;

		console.log('[Invite] Inviting user:', { email, role, full_name });

		// Use the admin client (service_role) to invite the user
		const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

		const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
			email,
			{
				redirectTo,
				data: { role, full_name },
			}
		)

		if (inviteError) {
			console.error('[Invite] Admin API error:', inviteError);
			return new Response(errorJson(inviteError.message), {
				status: 400,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		if (!inviteData?.user) {
			console.error('[Invite] No user returned from invite');
			return new Response(errorJson('Invite failed: no user created'), {
				status: 500,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		console.log('[Invite] User invited successfully:', inviteData.user.id);

		return new Response(JSON.stringify({ data: { id: inviteData.user.id, email: inviteData.user.email } }), {
			status: 200,
			headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
		})
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('[Invite] Fatal error:', message);
		return new Response(errorJson('Internal server error'), {
			status: 500,
			headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
		})
	}
})
