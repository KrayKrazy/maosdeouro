import { NextResponse } from 'next/server';

export type QuoteItem = {
  weight_kg: number;
  length_cm: number; // Altura em cm
  width_cm: number;  // Largura em cm
  height_cm: number; // Profundidade em cm
  quantity: number;
  type?: 'SHIPPABLE' | 'CUSTOM_PROJECT';
};

// Prefixos de CEP de Goiânia, Aparecida de Goiânia, Anápolis, Senador Canedo e Região Metropolitana
const LOCAL_CEP_PREFIXES = ['74', '75'];
const GOIAS_INTERIOR_PREFIX = '76';
const MAX_SHIPPABLE_CM = 250; // Transportadoras aceitam portas padrão de 210cm

function cubedWeight(item: QuoteItem): number {
  return (item.length_cm * item.width_cm * item.height_cm) / 6000;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cep, items, peso, comprimento, altura, largura, invoiceValue } = body;

    if (!cep) {
      return NextResponse.json({ error: 'CEP é obrigatório' }, { status: 400 });
    }

    const cleanCep = String(cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return NextResponse.json({ error: 'CEP deve conter 8 dígitos' }, { status: 400 });
    }

    // Normaliza lista de volumes do carrinho ou do item único
    const quoteItems: QuoteItem[] =
      Array.isArray(items) && items.length > 0
        ? items.map((i: any) => ({
            weight_kg: Number(i.weight_kg || i.peso || 28),
            length_cm: Number(i.length_cm || i.height_cm || 210),
            width_cm: Number(i.width_cm || 80),
            height_cm: Number(i.depth_cm || i.height_cm_depth || 12),
            quantity: Number(i.quantity || 1),
            type: i.type || 'SHIPPABLE',
          }))
        : [
            {
              weight_kg: Number(peso || 28),
              length_cm: Number(comprimento || altura || 210),
              width_cm: Number(largura || 80),
              height_cm: 12,
              quantity: 1,
              type: 'SHIPPABLE',
            },
          ];

    const totalWeight = quoteItems.reduce(
      (acc, i) => acc + Math.max(i.weight_kg, cubedWeight(i)) * i.quantity,
      0
    );
    const totalVolumes = quoteItems.reduce((acc, i) => acc + i.quantity, 0);

    // Verifica se algum volume excede limite máximo de transportadora (250cm)
    const exceedsCarrierLimit = quoteItems.some(
      (i) => i.length_cm > MAX_SHIPPABLE_CM || i.width_cm > MAX_SHIPPABLE_CM
    );

    const quotes: any[] = [];

    // 1. Se for Goiânia / Região Metropolitana (74xxx ou 75xxx), oferece Frota Própria + Retirada
    if (LOCAL_CEP_PREFIXES.some((p) => cleanCep.startsWith(p))) {
      quotes.push({
        carrier: 'Frota Própria — Mãos de Ouro (Goiânia e Região)',
        price: totalVolumes > 2 ? 189.90 : 129.90,
        deadline: 5,
        mode: 'ENTREGA_LOCAL',
        message: 'Transporte especializado para esquadrias e vidros.',
      });
      quotes.push({
        carrier: 'Retirada na Fábrica (Sem Custo de Frete)',
        price: 0,
        deadline: 3,
        mode: 'RETIRADA',
        message: 'Retire diretamente em nossa fábrica após confirmação.',
      });
    }

    // 2. Se exceder limite de medidas padrão (raro agora que tudo é padrão)
    if (exceedsCarrierLimit && quotes.length === 0) {
      return NextResponse.json({
        quotes: [
          {
            carrier: 'Frete Dedicado Carga Especial',
            price: Math.round((totalWeight * 3.2 + 180) * 100) / 100,
            deadline: 10,
            mode: 'COTACAO_MANUAL',
            message: 'Carga acima de 2,50m transportada via frete dedicado.',
          },
        ],
      });
    }

    // 3. Integração API Frenet (se FRENET_TOKEN estiver configurado)
    const FRENET_TOKEN = process.env.FRENET_TOKEN;
    if (FRENET_TOKEN && FRENET_TOKEN !== 'SEU_TOKEN_FRENET_AQUI') {
      try {
        const response = await fetch('https://api.frenet.com.br/shipping/quote', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            token: FRENET_TOKEN,
          },
          body: JSON.stringify({
            SellerCEP: (process.env.CEP_ORIGEM ?? '74000000').replace(/\D/g, ''),
            RecipientCEP: cleanCep,
            ShipmentInvoiceValue: invoiceValue || 1500,
            ShippingItemArray: quoteItems.map((i) => ({
              Weight: Math.max(i.weight_kg, cubedWeight(i)),
              Length: i.length_cm,
              Height: i.height_cm,
              Width: i.width_cm,
              Quantity: i.quantity,
            })),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const services = (data?.ShippingSevicesArray ?? [])
            .filter((s: any) => !s.Error && Number(s.ShippingPrice ?? s.Price) > 0)
            .map((s: any) => ({
              carrier: s.Carrier ?? s.Transportadora ?? s.ServiceDescription,
              price: Number(s.ShippingPrice ?? s.Price),
              deadline: Number(s.DeliveryTime || 7),
              mode: 'FRETE_CALCULADO',
            }));

          if (services.length > 0) {
            quotes.push(...services);
          }
        }
      } catch (frenetErr) {
        console.warn('[Frete] Falha na consulta Frenet, aplicando tabela de contingência por cubagem:', frenetErr);
      }
    }

    // 4. Tabela de Contingência Inteligente por Cubagem e Região (caso Frenet não retorne ou sem token)
    if (!quotes.some((q) => q.mode === 'FRETE_CALCULADO')) {
      const isGoias = cleanCep.startsWith('74') || cleanCep.startsWith('75') || cleanCep.startsWith(GOIAS_INTERIOR_PREFIX);
      const isCentroOesteSudeste = /^[01237]/.test(cleanCep);

      const baseRatePerKg = isGoias ? 1.85 : isCentroOesteSudeste ? 2.65 : 3.45;
      const fixedDispatch = isGoias ? 65 : isCentroOesteSudeste ? 95 : 135;

      const rodonavesPrice = Math.round((totalWeight * baseRatePerKg + fixedDispatch) * 100) / 100;
      const braspressPrice = Math.round((totalWeight * (baseRatePerKg * 1.12) + fixedDispatch + 15) * 100) / 100;

      quotes.push(
        {
          carrier: 'Rodonaves Transportes (Carga Fracionada / Esquadrias)',
          price: rodonavesPrice,
          deadline: isGoias ? 4 : isCentroOesteSudeste ? 7 : 12,
          mode: 'FRETE_CALCULADO',
          message: `Cálculo automático para ${totalVolumes} volume(s) (${Math.round(totalWeight)} kg cubados).`,
        },
        {
          carrier: 'Braspress Encomendas Urgentes',
          price: braspressPrice,
          deadline: isGoias ? 3 : isCentroOesteSudeste ? 6 : 10,
          mode: 'FRETE_CALCULADO',
          message: 'Seguro total incluso contra avarias no transporte.',
        }
      );
    }

    return NextResponse.json({
      quotes,
      summary: {
        totalVolumes,
        totalWeightKg: Math.round(totalWeight * 10) / 10,
      },
    });
  } catch (error: any) {
    console.error('Frenet API Route Error:', error.message);
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 });
  }
}
