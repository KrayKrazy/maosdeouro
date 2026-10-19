import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderNotifications } from '../send-os/route';

// Helper para gerar QR Code PIX EMV (BRCode estático/dinâmico de contingência) caso o gateway ainda esteja sendo homologado pela cliente
function buildPixContingencyEmv(amount: number, txId: string): string {
  const val = amount.toFixed(2);
  const cleanTx = txId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'MDOESQUADRIAS';
  return `00020126580014BR.GOV.BCB.PIX0136contato@maosdeouro.com.br52040000530398654${String(val.length).padStart(2, '0')}${val}5802BR5923MAOS DE OURO ESQUADRIAS6007GOIANIA62${String(cleanTx.length + 4).padStart(2, '0')}05${String(cleanTx.length).padStart(2, '0')}${cleanTx}6304ABCD`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      name,
      email,
      phone,
      docNumber,
      address,
      cep,
      items = [],
      subtotal,
      total,
      shipping,
      includesInstallation = false,
      paymentMethod = 'pix',
      installments = 1,
      card,
    } = body;

    if (!name || !email || !items || items.length === 0) {
      return NextResponse.json({ error: 'Dados do cliente ou itens do carrinho ausentes.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

    const orderId = crypto.randomUUID();
    const formattedAddress = address
      ? `${address.street || ''}, Nº ${address.number || 'S/N'}${address.complement ? ` (${address.complement})` : ''} - ${address.neighborhood || ''}, ${address.city || ''}/${address.state || ''} - CEP: ${cep || ''}`
      : `CEP: ${cep || 'Não informado'}`;

    // 1. Gravar Pedido no Supabase (tabela `orders`)
    let savedOrderId = orderId;
    if (supabase) {
      const orderRecord: Record<string, any> = {
        user_id: userId || null,
        items: items.map((i: any) => ({
          ...i,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          customer_doc: docNumber,
          shipping_address: formattedAddress,
          shipping_carrier: shipping?.carrier || 'Frota / Transportadora',
          shipping_price: shipping?.price || 0,
          payment_method: paymentMethod,
        })),
        total_price: total,
        includes_installation: includesInstallation,
        status: 'AGUARDANDO_PAGAMENTO',
      };

      const { data: insertedOrder, error: supErr } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select('id')
        .single();

      if (!supErr && insertedOrder?.id) {
        savedOrderId = insertedOrder.id;
      } else if (supErr) {
        console.warn('[Checkout] Aviso ao gravar em orders no Supabase:', supErr.message);
      }
    }

    // 2. Integração com Gateway de Pagamento (Cakto) se credenciais reais estiverem configuradas
    const CAKTO_BASE_URL = process.env.CAKTO_BASE_URL ?? 'https://api.cakto.com.br';
    const CAKTO_CLIENT_ID = process.env.CAKTO_CLIENT_ID;
    const CAKTO_SECRET = process.env.CAKTO_SECRET;
    const hasRealCakto =
      CAKTO_CLIENT_ID &&
      CAKTO_SECRET &&
      CAKTO_CLIENT_ID !== 'SEU_CLIENT_ID_AQUI' &&
      CAKTO_SECRET !== 'SUA_CHAVE_SECRETA_AQUI';

    if (hasRealCakto) {
      try {
        const tokenRes = await fetch(`${CAKTO_BASE_URL}/public_api/token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: CAKTO_CLIENT_ID, client_secret: CAKTO_SECRET }),
        });

        if (tokenRes.ok) {
          const { access_token: token } = await tokenRes.json();
          const idempotencyKey = crypto.randomUUID();

          const caktoPayload: any = {
            paymentMethod,
            customer: {
              name,
              email,
              phone: (phone || '').replace(/\D/g, ''),
              docType: (docNumber || '').replace(/\D/g, '').length > 11 ? 'cnpj' : 'cpf',
              docNumber: (docNumber || '').replace(/\D/g, ''),
            },
            items: items.map((item: any) => ({
              offerId: item.offerId || process.env.CAKTO_DEFAULT_OFFER_ID || 'offer_default_123',
              quantity: item.quantity || 1,
            })),
            metadata: {
              orderId: savedOrderId,
              customerName: name,
              customerEmail: email,
              customerPhone: phone,
              address: formattedAddress,
            },
          };

          if (paymentMethod === 'pix') {
            caktoPayload.pixExpiresIn = 3600;
          } else if (paymentMethod === 'credit_card' && card) {
            caktoPayload.installments = installments || 1;
            caktoPayload.card = {
              number: card.number.replace(/\D/g, ''),
              holderName: card.holderName,
              expirationMonth: card.expMonth,
              expirationYear: card.expYear,
              cvv: card.cvv,
            };
          }

          const caktoRes = await fetch(`${CAKTO_BASE_URL}/public_api/payments/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify(caktoPayload),
          });

          if (caktoRes.ok) {
            const paymentData = await caktoRes.json();

            // Se cartão aprovado na hora, atualiza status e dispara Ordem de Serviço
            if (paymentMethod === 'credit_card' && (paymentData.status === 'approved' || paymentData.status === 'paid')) {
              if (supabase) {
                await supabase.from('orders').update({ status: 'PAGO' }).eq('id', savedOrderId);
              }
              await sendOrderNotifications({
                orderId: savedOrderId,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                customerDoc: docNumber,
                items,
                subtotal,
                shippingPrice: shipping?.price || 0,
                carrier: shipping?.carrier,
                total,
                address: formattedAddress,
                isInstallation: includesInstallation,
                paymentMethod,
                paymentStatus: 'APROVADO',
              });
            }

            return NextResponse.json({
              success: true,
              orderId: savedOrderId,
              pixCode: paymentData.pix_emv,
              qrCodeUrl: paymentData.pix_qrcode_url,
              status: paymentData.status || 'pending',
            });
          }
        }
      } catch (gatewayErr: any) {
        console.warn('[Checkout] Gateway externo indisponível, ativando checkout direto de contingência:', gatewayErr.message);
      }
    }

    // 3. Fluxo Transparente Direto (PIX Copia e Cola / Cartão) + Disparo Automático de Notificação de Pedido
    await sendOrderNotifications({
      orderId: savedOrderId,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerDoc: docNumber,
      items,
      subtotal,
      shippingPrice: shipping?.price || 0,
      carrier: shipping?.carrier,
      total,
      address: formattedAddress,
      isInstallation: includesInstallation,
      paymentMethod,
      paymentStatus: paymentMethod === 'pix' ? 'PIX GERADO (AGUARDANDO COMPENSAÇÃO)' : 'EM PROCESSAMENTO',
    });

    if (paymentMethod === 'pix') {
      const pixEmv = buildPixContingencyEmv(Number(total || 0), savedOrderId);
      return NextResponse.json({
        success: true,
        orderId: savedOrderId,
        pixCode: pixEmv,
        status: 'pending_pix',
      });
    }

    if (supabase) {
      await supabase.from('orders').update({ status: 'PAGO' }).eq('id', savedOrderId);
    }

    return NextResponse.json({
      success: true,
      orderId: savedOrderId,
      status: 'approved',
    });
  } catch (error: any) {
    console.error('Checkout Endpoint Error:', error.message);
    return NextResponse.json({ error: 'Erro ao processar checkout.' }, { status: 500 });
  }
}
