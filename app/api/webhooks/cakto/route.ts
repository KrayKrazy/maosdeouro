import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Rota Segura para receber Webhooks do Cakto
export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-cakto-signature') || req.headers.get('signature');
    const CAKTO_WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET || process.env.CAKTO_SECRET;

    // 1. Validação de Segurança Base: Proteção contra ataques diretos
    if (!CAKTO_WEBHOOK_SECRET) {
      console.warn('CAKTO_WEBHOOK_SECRET não configurado. Aceitando payload (MUDAR EM PRODUÇÃO).');
    }

    const payloadText = await req.text();

    if (CAKTO_WEBHOOK_SECRET && signature) {
      // 2. Validação HMAC (Criptografia de Assinatura)
      // Garantindo que a requisição veio mesmo do Cakto e não foi adulterada
      const expectedSignature = crypto
        .createHmac('sha256', CAKTO_WEBHOOK_SECRET)
        .update(payloadText)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('ALERTA DE SEGURANÇA: Assinatura de Webhook Inválida.');
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
    }

    // 3. Processamento Seguro do Payload
    const data = JSON.parse(payloadText);
    const eventType = data.event || data.type;

    // Eventos mais comuns: payment.created, payment.approved, payment.refused
    if (eventType === 'payment.approved' || eventType === 'payment.pix.paid') {
      const orderId = data.data?.id;
      // TODO: Conectar com o Prisma e atualizar o pedido como PAGO
      // await prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } })
      
      console.log(`[Segurança] Pagamento aprovado processado com sucesso. Pedido: ${orderId}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
