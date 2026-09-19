// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { stripe, STRIPE_PRICE_ID, SITE_URL, getOrCreateStripeCustomer } from "../_shared/stripe.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse, getAllowedOrigin } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req: Request) => {
	const origin = getAllowedOrigin(req);

	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders(origin) });
	}

	const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';
	if (!checkRateLimit(`billing:${clientIp}`, 10, 60_000)) {
		return jsonResponse({ error: 'Too many requests' }, 429, origin);
	}

	try {
		const url = new URL(req.url);
		const pathSegments = url.pathname.split('/');
		const path = pathSegments[pathSegments.length - 1];

		if (path === 'cancel-subscription') {
			const { host_id } = await req.json();
			if (!host_id) return jsonResponse({ error: 'host_id required' }, 400, origin);

			const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
			const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
			const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
			const authHeader = req.headers.get('Authorization');
			const isServiceRole = Boolean(authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`);

			if (!isServiceRole) {
				const auth = await authenticateRequest(req, { supabaseUrl, anonKey: supabaseAnonKey });
				if (!auth) return jsonResponse({ error: 'Unauthorized' }, 401, origin);

				if (auth.userId !== host_id) {
					const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
					const { data: callerProfile } = await supabaseAdmin
						.from('profiles').select('role').eq('id', auth.userId).single();
					if (callerProfile?.role !== 'admin') {
						return jsonResponse({ error: 'Forbidden' }, 403, origin);
					}
				}
			}

			const supabase = createClient(
				supabaseUrl || Deno.env.get('SUPABASE_URL')!,
				Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
			);

			const { data: subs } = await supabase
				.from('subscriptions')
				.select('stripe_subscription_id')
				.eq('host_id', host_id)
				.in('status', ['active', 'past_due', 'unpaid']);

			if (subs) {
				for (const sub of subs) {
					try {
						await stripe.subscriptions.cancel(sub.stripe_subscription_id);
					} catch (stripeErr) {
						console.error(`Failed to cancel Stripe subscription ${sub.stripe_subscription_id}:`, stripeErr);
					}
				}
			}

			return jsonResponse({ success: true }, 200, origin);
		}

		if (path === 'pricing') {
			if (!STRIPE_PRICE_ID) {
				return jsonResponse({ error: 'Stripe price not configured' }, 500, origin);
			}
			try {
				const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);
				return jsonResponse({
					amount: price.unit_amount,
					currency: price.currency,
					interval: price.recurring?.interval ?? 'month',
				}, 200, origin);
			} catch {
				return jsonResponse({ error: 'Failed to fetch pricing' }, 500, origin);
			}
		}

		const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
		const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

		const auth = await authenticateRequest(req, {
			supabaseUrl,
			anonKey: supabaseAnonKey,
		});

		if (!auth) return jsonResponse({ error: 'Unauthorized' }, 401, origin);
		if (auth.role !== 'host') return jsonResponse({ error: 'Forbidden' }, 403, origin);

		const supabase = createClient(
			supabaseUrl,
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
		);

		switch (path) {
			case 'checkout': {
				const { data: profile } = await supabase
					.from('profiles')
					.select('is_invited')
					.eq('id', auth.userId)
					.single();

				if (profile?.is_invited) {
					return jsonResponse({ error: 'Your account includes complimentary platform access and does not require a subscription.' }, 400, origin);
				}

				const { data: existingSub } = await supabase
					.from('subscriptions')
					.select('id, status')
					.eq('host_id', auth.userId)
					.in('status', ['active', 'past_due', 'unpaid'])
					.maybeSingle();

				if (existingSub?.status === 'active') {
					return jsonResponse({ error: 'Already subscribed' }, 400, origin);
				}

				const { data: user } = await supabase
					.from('profiles')
					.select('email, full_name')
					.eq('id', auth.userId)
					.single();

				if (!user?.email) return jsonResponse({ error: 'Email not found' }, 400, origin);

				if (!STRIPE_PRICE_ID) {
					return jsonResponse({ error: 'Stripe price not configured' }, 500, origin);
				}

				const customer = await getOrCreateStripeCustomer(user.email, auth.userId);

				const session = await stripe.checkout.sessions.create({
					customer: customer.id,
					mode: 'subscription',
					line_items: [{ price: STRIPE_PRICE_ID!, quantity: 1 }],
					success_url: `${SITE_URL}/host/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
					cancel_url: `${SITE_URL}/host/subscription/canceled`,
					metadata: { host_id: auth.userId },
					subscription_data: { metadata: { host_id: auth.userId } },
				});

				return jsonResponse({ url: session.url }, 200, origin);
			}

			case 'portal': {
				const { data: sub } = await supabase
					.from('subscriptions')
					.select('stripe_customer_id')
					.eq('host_id', auth.userId)
					.single();

				if (!sub?.stripe_customer_id) {
					return jsonResponse({ error: 'No billing account found' }, 404, origin);
				}

				const session = await stripe.billingPortal.sessions.create({
					customer: sub.stripe_customer_id,
					return_url: `${SITE_URL}/host/account`,
				});

				return jsonResponse({ url: session.url }, 200, origin);
			}

			case 'verify': {
				const body = await req.json();
				const { session_id } = body;
				if (!session_id) return jsonResponse({ error: 'session_id required' }, 400, origin);

				const session = await stripe.checkout.sessions.retrieve(session_id);

				if (session.payment_status !== 'paid') {
					return jsonResponse({ error: 'Payment not completed' }, 400, origin);
				}

				if (session.metadata?.host_id !== auth.userId) {
					return jsonResponse({ error: 'Session does not belong to this user' }, 403, origin);
				}

				if (session.subscription) {
					const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
					await supabase.from('subscriptions').upsert({
						host_id: auth.userId,
						stripe_customer_id: subscription.customer as string,
						stripe_subscription_id: subscription.id,
						stripe_price_id: subscription.items.data[0]?.price.id ?? '',
						status: subscription.status,
						current_period_start: (() => {
							const cps = subscription.items.data[0]?.current_period_start ?? subscription.current_period_start;
							return cps ? new Date(cps * 1000).toISOString() : null;
						})(),
						current_period_end: (() => {
							const cpe = subscription.items.data[0]?.current_period_end ?? subscription.current_period_end;
							return cpe ? new Date(cpe * 1000).toISOString() : null;
						})(),
						cancel_at: subscription.cancel_at
							? new Date(subscription.cancel_at * 1000).toISOString()
							: null,
						canceled_at: subscription.canceled_at
							? new Date(subscription.canceled_at * 1000).toISOString()
							: null,
					}, { onConflict: 'stripe_subscription_id' });
				}

				return jsonResponse({
					status: session.subscription ? 'active' : 'unknown',
					subscription_id: session.subscription,
				}, 200, origin);
			}

			case 'status': {
				const { data: sub } = await supabase
					.from('subscriptions')
					.select('status, current_period_end, cancel_at')
					.eq('host_id', auth.userId)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();

				return jsonResponse({
					status: sub?.status ?? null,
					current_period_end: sub?.current_period_end ?? null,
					cancel_at: sub?.cancel_at ?? null,
				}, 200, origin);
			}

			default:
				return jsonResponse({ error: 'Not found' }, 404, origin);
		}
	} catch (err) {
		console.error('stripe-billing error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return jsonResponse({ error: `Internal server error: ${message}` }, 500, origin);
	}
});
