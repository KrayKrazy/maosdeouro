import { NextResponse } from 'next/server';

type QuoteItem = {
  weight_kg: number; length_cm: number; width_cm: number; height_cm: number;
  quantity: number; type: 'SHIPPABLE' | 'CUSTOM_PROJECT';
};

const LOCAL_CEP_PREFIXES = ['74', '75', '76'];
const MAX_SHIPPABLE_CM = 300;
const MAX_SHIPPABLE_KG = 80;

function cubedWeight(item: QuoteItem): number {
  return (item.length_cm * item.width_cm * item.height_cm) / 6000;
}

function resolveMode(cep: string, items: QuoteItem[]): 'COTACAO_MANUAL' | 'ENTREGA_LOCAL' | 'FRETE_CALCULADO' {
  const hasCustom = items.some(
    (i) =>
      i.type === 'CUSTOM_PROJECT' ||
      i.length_cm > MAX_SHIPPABLE_CM ||
      i.width_cm > MAX_SHIPPABLE_CM ||
      i.weight_kg > MAX_SHIPPABLE_KG,
  );
  if (hasCustom) return 'COTACAO_MANUAL';
  if (LOCAL_CEP_PREFIXES.some((p) => cep.replace(/\D/g, '').startsWith(p))) {
    return 'ENTREGA_LOCAL';
  }
  return 'FRETE_CALCULADO';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cep, items, peso, comprimento, altura, largura } = body;

    if (!cep) {
      return NextResponse.json({ error: 'CEP é obrigatório' }, { status: 400 });
    }

    // Adapt to either full items array or single dimensional payload
    const quoteItems: QuoteItem[] = items && items.length > 0 ? items : [{
      weight_kg: peso || 20,
      length_cm: comprimento || 100,
      width_cm: largura || 100,
      height_cm: altura || 100,
      quantity: 1,
      type: 'CUSTOM_PROJECT' // By default, everything in Mãos de Ouro is custom project
    }];

    const mode = resolveMode(cep, quoteItems);

    if (mode === 'COTACAO_MANUAL') {
      return NextResponse.json({
        quotes: [{
          carrier: 'Consultoria Especializada',
          price: 0,
          deadline: 0,
          mode: 'COTACAO_MANUAL',
          message: 'Peça de grande dimensão/sob medida. Finalizar o pedido e nossa equipe definirá a melhor logística.'
        }]
      });
    }

    if (mode === 'ENTREGA_LOCAL') {
      return NextResponse.json({
        quotes: [{
          carrier: 'Frota Própria (Mãos de Ouro)',
          price: 149.90,
          deadline: 7,
          mode: 'ENTREGA_LOCAL',
          message: 'Entrega + instalação Goiânia e região.'
        }]
      });
    }

    // FRETE_CALCULADO via Frenet — filtra só carga pesada
    const FRENET_TOKEN = process.env.FRENET_TOKEN;
    if (!FRENET_TOKEN) {
      return NextResponse.json({
        quotes: [
          { carrier: 'Braspress (Carga Pesada)', price: (quoteItems[0].weight_kg * 1.5) + 80, deadline: 5, mode: 'FRETE_CALCULADO' }
        ]
      });
    }

    const totalWeight = quoteItems.reduce((a, i) => a + i.weight_kg * i.quantity, 0);
    const response = await fetch('https://api.frenet.com.br/shipping/quote', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': FRENET_TOKEN
      },
      body: JSON.stringify({
        SellerCEP: (process.env.CEP_ORIGEM ?? '74000000').replace(/\D/g, ''),
        RecipientCEP: cep.replace(/\D/g, ''),
        ShipmentInvoiceValue: 1000,
        ShippingItemArray: quoteItems.map((i) => ({
          Weight: Math.max(i.weight_kg, cubedWeight(i)),
          Length: i.length_cm, Height: i.height_cm, Width: i.width_cm, Quantity: i.quantity,
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Frenet error: ${await response.text()}`);
    }

    const data = await response.json();
    const services = (data?.ShippingSevicesArray ?? [])
      .filter((s: any) => !s.Error && /braspress|rodonaves|jadlog|jamef/i.test(s?.Carrier ?? s?.Transportadora ?? s?.ServiceDescription ?? ''))
      .map((s: any) => ({ 
        carrier: s.Carrier ?? s.Transportadora ?? s.ServiceDescription, 
        price: Number(s.Price ?? s.ShippingPrice), 
        deadline: s.DeliveryTime,
        mode: 'FRETE_CALCULADO'
      }));

    return NextResponse.json({ quotes: services.length > 0 ? services : [{
      carrier: 'Transportadora Especializada',
      price: 250,
      deadline: 15,
      mode: 'FRETE_CALCULADO'
    }]});

  } catch (error: any) {
    console.error('Frenet API Route Error:', error.message);
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 });
  }
}
