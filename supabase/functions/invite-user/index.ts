// @ts-nocheck
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

		console.log('[Invite] Environment check:', {
			hasUrl: !!supabaseUrl,
			hasAnonKey: !!supabaseAnonKey,
			hasServiceRole: !!serviceRoleKey,
		});

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

		// Check admin role via direct REST API call (avoids gotrue-js Admin client)
		let profileRole: string | null = null;
		try {
			const profileResponse = await fetch(
				`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
				{
					headers: {
						'apikey': serviceRoleKey,
						'Authorization': `Bearer ${serviceRoleKey}`,
					},
				},
			);
			if (profileResponse.ok) {
				const profiles = await profileResponse.json();
				profileRole = profiles?.[0]?.role ?? null;
			} else {
				console.warn('[Invite] Profile fetch failed:', profileResponse.status);
			}
		} catch (profileErr) {
			console.warn('[Invite] Profile fetch exception:', profileErr instanceof Error ? profileErr.message : profileErr);
		}

		const isAdmin = user?.app_metadata?.role === 'admin' || profileRole === 'admin';

		if (!isAdmin) {
			return new Response(errorJson('Unauthorized'), {
				status: 401,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		const { email, role, full_name, origin: bodyOrigin } = await req.json()

		const redirectOrigin = bodyOrigin || req.headers.get('origin') || new URL(req.url).origin;
		const redirectTo = `${redirectOrigin}/set-password`;

		console.log('[Invite] Calling Admin API to invite user:', email);

		const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'apikey': serviceRoleKey,
				'Authorization': `Bearer ${serviceRoleKey}`,
			},
			body: JSON.stringify({
				email,
				email_confirm: true,
				invite: true,
				data: { role, full_name, password_set: false },
				redirect_to: redirectTo,
			}),
		});

		const inviteData = await inviteResponse.json();

		if (!inviteResponse.ok) {
			const errorMsg = typeof inviteData?.error === 'string'
				? inviteData.error
				: typeof inviteData?.msg === 'string'
					? inviteData.msg
					: `Auth Admin API returned status ${inviteResponse.status}`;
			console.error('[Invite] Admin API error:', inviteResponse.status, errorMsg, inviteData);
			return new Response(errorJson(errorMsg), {
				status: 400,
				headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
			})
		}

		console.log('[Invite] User invited successfully:', inviteData?.id);

		if (inviteData?.id) {
			// Update user metadata via direct Admin API call
			const updateResponse = await fetch(
				`${supabaseUrl}/auth/v1/admin/users/${inviteData.id}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'apikey': serviceRoleKey,
						'Authorization': `Bearer ${serviceRoleKey}`,
					},
					body: JSON.stringify({
						app_metadata: { role, provider: 'email', providers: ['email'] },
						user_metadata: {
							sub: inviteData.id,
							role,
							full_name,
							email_verified: false,
							password_set: false,
						},
					}),
				},
			);

			if (!updateResponse.ok) {
				const updateError = await updateResponse.json();
				console.error('[Invite] User invited but metadata update failed:', updateError);
			}
		}

		return new Response(JSON.stringify({ data: inviteData }), {
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
