// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  link?: string;
}

function extractPushPayload(reqBody: Record<string, unknown>): PushPayload | null {
  // Format 1: Direct call (from frontend or manual test)
  if (reqBody.userId && reqBody.title) {
    return {
      userId: reqBody.userId as string,
      title: reqBody.title as string,
      body: reqBody.body as string | undefined,
      data: reqBody.data as Record<string, unknown> | undefined,
    };
  }

  // Format 2: Supabase Dashboard Webhook
  // Payload structure: { type, table, record: { user_id, title, message, data, link }, old_record }
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim() ?? '';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim() ?? '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim() ?? 'mailto:admin@example.com';

    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured');
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    console.log('[Push] VAPID configured:', { subject: vapidSubject, hasPublicKey: !!vapidPublicKey, hasPrivateKey: !!vapidPrivateKey });

    const reqBody = await req.json();
    const pushPayload = extractPushPayload(reqBody);

    if (!pushPayload) {
      return new Response(JSON.stringify({ error: 'Missing userId or title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, title, body, data, link } = pushPayload;
    console.log('[Push] Received request:', { userId, title, body, data, link });

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

    console.log('[Push] Subscriptions found:', { count: subscriptions?.length, error: fetchError });

    if (fetchError || !subscriptions) throw fetchError || new Error("No data");

    console.log('[Push] First subscription endpoint:', subscriptions[0]?.subscription?.endpoint);

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
          const response = await webPush.sendNotification(sub.subscription, payload);
          console.log(`[Push] Sent successfully to sub ${sub.id}:`, response.statusCode);
          return { success: true, statusCode: response.statusCode };
        } catch (err: unknown) {
          const error = err as { statusCode?: number; message?: string; body?: string };
          console.error(`[Push] Error for sub ${sub.id}:`, {
            statusCode: error.statusCode,
            message: error.message,
            body: error.body,
          });

          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
            return { success: false, reason: 'expired', statusCode: error.statusCode };
          }
          return { success: false, reason: error.message || 'unknown', statusCode: error.statusCode };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;

    return new Response(JSON.stringify({ sent: successful, total: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    } catch (error) {
    const err = error as { statusCode?: number; message?: string; body?: string };
    console.error('[Push] Error:', {
      statusCode: err.statusCode,
      body: err.body,
      message: err.message,
    });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});