import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.110.7';

const jsonHeaders = { 'Content-Type': 'application/json' };

function readNamedKey(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const values = Object.values(JSON.parse(raw));
    return typeof values[0] === 'string' ? values[0] : undefined;
  } catch {
    return undefined;
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? Deno.env.get('SUPABASE_SECRET_KEY')
  ?? readNamedKey('SUPABASE_SECRET_KEYS');

if (!secretKey) throw new Error('Supabase secret key is unavailable.');

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function clearInvalidToken(deviceId: string) {
  await admin.from('devices').update({ push_token: null }).eq('id', deviceId);
}

async function checkPendingReceipts() {
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: pending } = await admin
    .from('push_delivery_receipts')
    .select('ticket_id,device_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(100);

  if (!pending?.length) return;
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ ids: pending.map((item) => item.ticket_id) }),
  });
  if (!response.ok) return;

  const payload = await response.json();
  for (const item of pending) {
    const receipt = payload?.data?.[item.ticket_id];
    if (!receipt) continue;
    const errorCode = receipt.details?.error ?? null;
    await admin.from('push_delivery_receipts').update({
      status: receipt.status === 'ok' ? 'ok' : 'error',
      error_code: errorCode,
      error_message: receipt.message ?? null,
      checked_at: new Date().toISOString(),
    }).eq('ticket_id', item.ticket_id);
    if (errorCode === 'DeviceNotRegistered') await clearInvalidToken(item.device_id);
  }
}

async function removeExpiredDiagnostics() {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString();
  await admin.from('cast_diagnostics').delete().lt('created_at', cutoff);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok');
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { sessionId, receiverDeviceId } = await req.json();
    if (typeof sessionId !== 'string' || typeof receiverDeviceId !== 'string') {
      return Response.json({ error: 'Invalid cast notification request' }, { status: 400 });
    }

    const { data: castRequest } = await admin
      .from('cast_requests')
      .select('id')
      .eq('session_id', sessionId)
      .eq('receiver_device_id', receiverDeviceId)
      .eq('sender_user_id', authData.user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!castRequest) {
      return Response.json({ error: 'You are not authorized to notify this device' }, { status: 403 });
    }

    const { data: device, error: deviceError } = await admin
      .from('devices')
      .select('push_token')
      .eq('id', receiverDeviceId)
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (!device?.push_token) {
      return Response.json({ delivered: false, reason: 'no_push_token' });
    }

    await Promise.all([checkPendingReceipts(), removeExpiredDiagnostics()]);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        to: device.push_token,
        sound: 'default',
        title: 'Incoming Beam Cast',
        body: 'Someone wants to cast to this device.',
        data: { type: 'cast_request', sessionId },
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return Response.json({ error: 'Expo rejected the push request' }, { status: 502 });
    }

    const ticket = payload?.data;
    if (ticket?.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') await clearInvalidToken(receiverDeviceId);
      return Response.json({ error: ticket.message ?? 'Expo could not deliver the notification' }, { status: 502 });
    }

    if (ticket?.id) {
      await admin.from('push_delivery_receipts').upsert({
        ticket_id: ticket.id,
        device_id: receiverDeviceId,
        status: 'pending',
      });
    }

    return new Response(JSON.stringify({ delivered: true, ticketId: ticket?.id ?? null }), {
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error('[send-cast-notification]', error);
    return Response.json({ error: 'Could not send cast notification' }, { status: 500 });
  }
});
