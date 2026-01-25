import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Protección para que no falle el build en GitHub/Vercel
const supabase = (url && key) ? createClient(url, key) : null;

export async function POST(req: Request) {
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  try {
    const rawBody = await req.text();
    const hmac = crypto.createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '');
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers.get('x-signature') || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventName = body.meta.event_name;
    const email = body.data.attributes.user_email;

    if (eventName === 'order_created') {
      const creditsToAdd = 100; // Ajusta según el plan
      const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', email).single();
      const newTotal = (profile?.usage_count || 0) + creditsToAdd;
      await supabase.from('profiles').update({ usage_count: newTotal, is_pro: true }).eq('email', email);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}