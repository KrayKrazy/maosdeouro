import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, email, phone, docNumber, items, total, shipping, 
      paymentMethod, installments, card 
    } = body;

    const CAKTO_BASE_URL = process.env.CAKTO_BASE_URL ?? "https://api.cakto.com.br";
    const CAKTO_CLIENT_ID = process.env.CAKTO_CLIENT_ID;
    const CAKTO_SECRET = process.env.CAKTO_SECRET;

    if (!CAKTO_CLIENT_ID || !CAKTO_SECRET) {
      return NextResponse.json({ error: 'Gateway de Pagamento não configurado corretamente.' }, { status: 500 });
    }

    // 1. Obter Cliente no Banco (Upsert)
    const customer = await prisma.customer.upsert({
      where: { email },
      update: { name, phone, docNumber: docNumber || '' },
      create: {
        name, email, phone,
        docType: (docNumber || '').length > 14 ? 'cnpj' : 'cpf',
        docNumber: docNumber || '',
        fingerprint: 'web_checkout_flow'
      }
    });

    const idempotencyKey = crypto.randomUUID();

    // 2. Criar Pedido PENDENTE no Banco (Prisma)
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: 'PENDING_PAYMENT',
        paymentMethod: paymentMethod === 'credit_card' ? 'credit_card' : 'pix',
        subtotal: items.reduce((acc: number, i: any) => acc + i.price, 0),
        shipping_price: shipping.price,
        total: total,
        installments: installments || 1,
        shipping_mode: 'FRETE_CALCULADO',
        cep_destino: shipping.cep || '00000000',
        carrier: shipping.carrier,
        idempotency_key: idempotencyKey,
      }
    });

    // 3. Obter Token do Cakto
    const tokenRes = await fetch(`${CAKTO_BASE_URL}/public_api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CAKTO_CLIENT_ID, client_secret: CAKTO_SECRET }),
    });
    
    if (!tokenRes.ok) throw new Error('Falha de Autenticação com Cakto');
    const { access_token: token } = await tokenRes.json();

    // 4. Montar Payload para o Cakto
    // Para preço dinâmico customizado sem cadastrar o produto (depende do plano Cakto)
    const caktoPayload: any = {
      paymentMethod: paymentMethod,
      customer: {
        name, email, phone,
        docType: (docNumber || '').length > 14 ? 'cnpj' : 'cpf',
        docNumber: (docNumber || '').replace(/\D/g, '')
      },
      items: items.map((item: any) => ({
        // Fallback para offerId genérica se o Cakto não aceitar checkout sem Offer ID pré-existente
        offerId: item.offerId || "offer_default_123", 
        quantity: 1,
        customPrice: Math.round(item.price * 100),
        description: item.name
      })),
      metadata: {
        orderId: order.id
      }
    };

    if (paymentMethod === 'pix') {
      caktoPayload.pixExpiresIn = 3600;
    } else if (paymentMethod === 'credit_card') {
      caktoPayload.installments = installments || 1;
      // Envio transparente do cartão (atenção a PCI-Compliance e Tokenização)
      caktoPayload.card = {
        number: card.number.replace(/\D/g, ''),
        holderName: card.holderName,
        expirationMonth: card.expMonth,
        expirationYear: card.expYear,
        cvv: card.cvv
      };
    }

    // 5. Enviar para Cakto
    const caktoRes = await fetch(`${CAKTO_BASE_URL}/public_api/payments/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(caktoPayload),
    });

    const paymentData = await caktoRes.json();

    if (!caktoRes.ok) {
      console.error('Cakto Payment Error:', paymentData);
      
      // Atualizar pedido como falho no DB
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cakto_ref: paymentData.error || 'Gateway Error' }
      });

      return NextResponse.json({ error: 'Pagamento recusado pelo processador.' }, { status: 400 });
    }

    // 6. Atualizar Pedido com os dados retornados do gateway
    await prisma.order.update({
      where: { id: order.id },
      data: {
        cakto_order_id: paymentData.id,
        cakto_checkout_url: paymentData.checkout_url
      }
    });

    if (paymentMethod === 'pix') {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        pixCode: paymentData.pix_emv,
        qrCodeUrl: paymentData.pix_qrcode_url
      });
    } else {
      // Cartão de Crédito aprovado direto no fluxo Transparente
      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: paymentData.status // Ex: "approved"
      });
    }

  } catch (error: any) {
    console.error('Checkout Endpoint Error:', error.message);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
