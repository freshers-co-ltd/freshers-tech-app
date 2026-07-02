// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface PushPayload {
  userId: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  link?: string;
}

function extractPushPayload(reqBody: Record<string, unknown>): PushPayload | null {
  const record = reqBody.record as Record<string, unknown> | undefined;
  if (record) {
    const userId = record.user_id as string | undefined;
    const title = record.title as string | undefined;
    if (userId && title) {
      return {
        userId,
        title,
        body: record.message as string | undefined,
        data: record.data as Record<string, unknown> | undefined,
        link: record.link as string | undefined,
      };
    }
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`push:${clientIp}`, 10, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
  if (!WEBHOOK_SECRET || req.headers.get('Webhook-secret') !== WEBHOOK_SECRET) {
    console.warn('[Push] Unauthorized call — missing or invalid webhook secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim() ?? '';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim() ?? '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim() ?? '';

    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured');
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const reqBody = await req.json();
    const pushPayload = extractPushPayload(reqBody);

    if (!pushPayload) {
      return new Response(JSON.stringify({ error: 'Missing userId or title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, title, body, data, link } = pushPayload;

    if (!userId || !title) {
      return new Response(JSON.stringify({ error: 'Missing userId or title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription, id')
      .eq('user_id', userId);

    console.log('[Push] Subscriptions found:', subscriptions?.length ?? 0);

    if (fetchError || !subscriptions) throw fetchError || new Error("No data");

    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: '/pwa-192x192.png',
      data: {
        ...data,
        link,
        unreadCount: unreadCount ?? 0,
      },
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(sub.subscription, payload);
          return { success: true };
        } catch (err: unknown) {
          const error = err as { statusCode?: number; message?: string; body?: string };

          if (
            error.statusCode === 410 ||
            error.statusCode === 404 ||
            (error.body && typeof error.body === 'string' && error.body.includes('VapidPkHashMismatch'))
            ) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
              return { success: false, reason: 'stale', statusCode: error.statusCode, body: error.body };
            }
            return { success: false, reason: error.message || 'unknown', statusCode: error.statusCode, body: error.body };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (failed > 0) {
      results.forEach((r, i) => {
        if (!r.success) {
          console.error(`[Push] Notification ${i} failed:`, r.reason, 'statusCode:', r.statusCode, 'body:', (r as { body?: string }).body);
        }
      });
    }

    return new Response(JSON.stringify({ sent: successful, total: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    } catch (error) {
    const err = error as { message?: string };
    console.error('[Push] Fatal error:', err.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
