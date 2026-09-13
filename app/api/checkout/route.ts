import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, email, phone, docNumber, items, total, shipping } = await req.json();

    const CAKTO_BASE_URL = process.env.CAKTO_BASE_URL ?? "https://api.cakto.com.br";
    const CAKTO_CLIENT_ID = process.env.CAKTO_CLIENT_ID;
    const CAKTO_SECRET = process.env.CAKTO_SECRET;

    if (!CAKTO_CLIENT_ID || !CAKTO_SECRET) {
      // MOCK: Simulação do checkout sem credenciais na Vercel
      return NextResponse.json({
        success: true,
        mock: true,
        orderId: 'mock_' + Date.now(),
        pixCode: '00020126580014br.gov.bcb.pix0136mock-pix-code-for-testing-123456789',
        qrCodeUrl: 'https://via.placeholder.com/200x200.png?text=PIX+QR+CODE',
        message: 'Credenciais do Cakto não configuradas. Simulação gerada com sucesso.'
      });
    }

    // 1. Obter Token do Cakto
    const tokenRes = await fetch(`${CAKTO_BASE_URL}/public_api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CAKTO_CLIENT_ID, client_secret: CAKTO_SECRET }),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // 2. Gerar Cobrança PIX
    // Opcional: Criar no PrismaDB aqui antes de chamar o Cakto
    
    const idempotencyKey = crypto.randomUUID();

    const pixRes = await fetch(`${CAKTO_BASE_URL}/public_api/payments/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        paymentMethod: "pix",
        customer: {
          name,
          email,
          phone,
          docType: docNumber.length > 14 ? 'cnpj' : 'cpf',
          docNumber: docNumber.replace(/\D/g, ''),
          fingerprint: 'web_checkout'
        },
        // Assumindo que temos um OfferId genérico ou passamos um valor customizado
        items: items.map((item: any) => ({
          offerId: item.offerId || "offer_default_123", // Requer offer real do painel Cakto
          quantity: 1,
          customPrice: Math.round(item.price * 100) // em centavos
        })),
        pixExpiresIn: 3600, // 1 hora
      }),
    });

    if (!pixRes.ok) {
      const errorText = await pixRes.text();
      console.error('Cakto Error:', errorText);
      return NextResponse.json({ error: 'Erro no processamento do pagamento Cakto' }, { status: 400 });
    }

    const paymentData = await pixRes.json();

    return NextResponse.json({
      success: true,
      orderId: paymentData.id,
      pixCode: paymentData.pix_emv, // Código copia e cola real do Cakto
      qrCodeUrl: paymentData.pix_qrcode_url
    });
  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: 'Erro interno no checkout' }, { status: 500 });
  }
}
