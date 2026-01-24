import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const hmac = crypto.createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '');
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers.get('x-signature') || '', 'utf8');

    // Validación de seguridad: solo aceptamos peticiones reales de Lemon Squeezy
    if (!crypto.timingSafeEqual(digest, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventName = body.meta.event_name;
    const email = body.data.attributes.user_email;
    const variantId = body.data.attributes.variant_id; // Para identificar el plan

    if (eventName === 'order_created') {
      // Si es tu plan Starter (puedes ajustar el ID luego), damos 100 créditos
      const creditsToAdd = 100;

      const { data: profile } = await supabase
        .from('profiles')
        .select('usage_count')
        .eq('email', email)
        .single();

      const newTotal = (profile?.usage_count || 0) + creditsToAdd;

      await supabase
        .from('profiles')
        .update({ 
          usage_count: newTotal, 
          is_pro: true 
        })
        .eq('email', email);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}