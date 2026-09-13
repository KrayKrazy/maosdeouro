import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { cep, peso, comprimento, altura, largura } = await req.json();

    if (!cep) {
      return NextResponse.json({ error: 'CEP é obrigatório' }, { status: 400 });
    }

    // Aqui entramos com a integração real da Frenet.
    const FRENET_TOKEN = process.env.FRENET_TOKEN;

    if (!FRENET_TOKEN) {
      // MOCK: Simulação de cálculo de frete se não houver token configurado na Vercel
      // Para peças grandes, as transportadoras comuns não servem.
      return NextResponse.json({
        quotes: [
          {
            carrier: 'Braspress (Carga Pesada)',
            price: (peso * 1.5) + 80, // Cálculo fictício
            deadline: 5,
            mode: 'FRETE_CALCULADO'
          },
          {
            carrier: 'Jadlog (Fracionado)',
            price: (peso * 2.0) + 50, // Cálculo fictício
            deadline: 8,
            mode: 'FRETE_CALCULADO'
          }
        ]
      });
    }

    // Chamada Real para a Frenet
    const response = await fetch('https://api.frenet.com.br/shipping/quote', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': FRENET_TOKEN
      },
      body: JSON.stringify({
        SellerCEP: '74000000', // CEP Origem (Goiânia)
        RecipientCEP: cep.replace(/\D/g, ''),
        ShipmentInvoiceValue: 1000,
        ShippingItemArray: [
          {
            Height: altura,
            Length: comprimento,
            Quantity: 1,
            Weight: peso,
            Width: largura
          }
        ]
      })
    });

    const data = await response.json();
    
    // Filtrar apenas transportadoras que suportam o peso/dimensões (excluindo erro)
    const validQuotes = data.ShippingSevicesArray.filter((s: any) => !s.Error).map((s: any) => ({
      carrier: s.ServiceDescription,
      price: parseFloat(s.ShippingPrice),
      deadline: parseInt(s.DeliveryTime),
      mode: 'FRETE_CALCULADO'
    }));

    return NextResponse.json({ quotes: validQuotes });
  } catch (error) {
    console.error('Frenet Error:', error);
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 });
  }
}
