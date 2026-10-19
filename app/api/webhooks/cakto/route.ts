import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendOrderNotifications } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-cakto-signature') || req.headers.get('signature');
    const CAKTO_WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET || process.env.CAKTO_SECRET;

    const payloadText = await req.text();

    if (
      CAKTO_WEBHOOK_SECRET &&
      CAKTO_WEBHOOK_SECRET !== 'SEU_SEGREDO_DE_WEBHOOK_AQUI' &&
      CAKTO_WEBHOOK_SECRET !== 'SUA_CHAVE_SECRETA_AQUI' &&
      signature
    ) {
      const expectedSignature = crypto
        .createHmac('sha256', CAKTO_WEBHOOK_SECRET)
        .update(payloadText)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(payloadText);
    const eventType = data.event || data.type || '';
    const metadata = data.data?.metadata || {};
    const orderId = metadata.orderId || data.data?.id;

    if (!orderId) {
      return NextResponse.json({ error: 'Sem Order ID no payload' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

    let orderRecord: any = null;
    if (supabase) {
      const { data: found } = await supabase.from('orders').select('*').eq('id', orderId).single();
      orderRecord = found;
    }

    // Pagamento Aprovado (PIX ou Cartão)
    if (
      eventType === 'payment.approved' ||
      eventType === 'payment.pix.paid' ||
      eventType === 'purchase_approved' ||
      data.data?.status === 'approved' ||
      data.data?.status === 'paid'
    ) {
      if (supabase && orderRecord) {
        await supabase.from('orders').update({ status: 'PAGO' }).eq('id', orderId);
      }

      const firstItem = orderRecord?.items?.[0] || {};
      await sendOrderNotifications({
        orderId,
        customerName: metadata.customerName || firstItem.customer_name || data.data?.customer?.name || 'Cliente Mãos de Ouro',
        customerEmail: metadata.customerEmail || firstItem.customer_email || data.data?.customer?.email || '',
        customerPhone: metadata.customerPhone || firstItem.customer_phone || data.data?.customer?.phone || '',
        items: orderRecord?.items || data.data?.items || [],
        shippingPrice: firstItem.shipping_price || 0,
        carrier: firstItem.shipping_carrier || 'Transportadora',
        total: Number(orderRecord?.total_price || data.data?.amount || 0),
        address: metadata.address || firstItem.shipping_address || 'Endereço informado no pedido',
        isInstallation: Boolean(orderRecord?.includes_installation),
        paymentMethod: firstItem.payment_method || data.data?.paymentMethod || 'pix',
        paymentStatus: 'PAGAMENTO CONFIRMADO',
      });

      return NextResponse.json({ received: true, status: 'PAGO', notified: true }, { status: 200 });
    }

    // Pagamento Recusado / Cancelado
    if (eventType === 'payment.refused' || eventType === 'payment.failed' || eventType === 'payment.cancelled') {
      if (supabase && orderRecord) {
        await supabase.from('orders').update({ status: 'CANCELADO' }).eq('id', orderId);
      }
      return NextResponse.json({ received: true, status: 'CANCELADO' }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
