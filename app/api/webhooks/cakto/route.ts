import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-cakto-signature') || req.headers.get('signature');
    const CAKTO_WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET || process.env.CAKTO_SECRET;

    if (!CAKTO_WEBHOOK_SECRET) {
      console.warn('CAKTO_WEBHOOK_SECRET não configurado. Aceitando payload.');
    }

    const payloadText = await req.text();

    if (CAKTO_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', CAKTO_WEBHOOK_SECRET)
        .update(payloadText)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(payloadText);
    const eventType = data.event || data.type;
    const caktoOrderId = data.data?.id;
    const metadataOrderId = data.data?.metadata?.orderId; // Recebido caso enviado na criação

    // 1. Log do evento no banco
    await prisma.webhookEvent.create({
      data: {
        source: 'cakto',
        event: eventType,
        payload: data,
        processed: false
      }
    });

    if (!caktoOrderId && !metadataOrderId) {
      return NextResponse.json({ error: 'Sem Order ID no payload' }, { status: 400 });
    }

    // 2. Tenta achar o pedido no Prisma
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { cakto_order_id: caktoOrderId },
          { id: metadataOrderId }
        ]
      }
    });

    if (!order) {
      console.error(`Pedido não encontrado para o evento: ${caktoOrderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Processar Pagamento Aprovado
    if (eventType === 'payment.approved' || eventType === 'payment.pix.paid') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAYMENT_CONFIRMED' }
      });
      console.log(`[Webhook] Pedido ${order.id} marcado como PAGO.`);
    }

    // 4. Processar Pagamento Recusado
    if (eventType === 'payment.refused' || eventType === 'payment.failed') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
      });
      console.log(`[Webhook] Pedido ${order.id} CANCELADO/RECUSADO.`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
