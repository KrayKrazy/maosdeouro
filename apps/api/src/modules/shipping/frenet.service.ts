import { Injectable } from '@nestjs/common';

type QuoteItem = {
  weight_kg: number; length_cm: number; width_cm: number; height_cm: number;
  quantity: number; type: 'SHIPPABLE' | 'CUSTOM_PROJECT';
};

// Regras Mãos de Ouro: Correios excluídos. Carga pesada via Frenet.
// Limites: >300cm ou >80kg ou CUSTOM_PROJECT => COTACAO_MANUAL.
// CEP local Goiânia/Anápolis/Senador Canedo => ENTREGA_LOCAL.
const LOCAL_CEP_PREFIXES = ['74', '75', '76'];
const MAX_SHIPPABLE_CM = 300;
const MAX_SHIPPABLE_KG = 80;

@Injectable()
export class FrenetService {
  cubedWeight(item: QuoteItem): number {
    return (item.length_cm * item.width_cm * item.height_cm) / 6000;
  }

  resolveMode(cep: string, items: QuoteItem[]): 'COTACAO_MANUAL' | 'ENTREGA_LOCAL' | 'FRETE_CALCULADO' {
    const hasCustom = items.some(
      (i) =>
        i.type === 'CUSTOM_PROJECT' ||
        i.length_cm > MAX_SHIPPABLE_CM ||
        i.width_cm > MAX_SHIPPABLE_CM ||
        i.weight_kg > MAX_SHIPPABLE_KG,
    );
    if (hasCustom) return 'COTACAO_MANUAL';
    if (LOCAL_CEP_PREFIXES.some((p) => cep.replace(/\D/g, '').startsWith(p)))
      return 'ENTREGA_LOCAL';
    return 'FRETE_CALCULADO';
  }

  async quote(cep_destino: string, items: QuoteItem[]) {
    const mode = this.resolveMode(cep_destino, items);

    if (mode === 'COTACAO_MANUAL') {
      return {
        mode, carrier: null, price: null,
        message: 'Peça de grande dimensão/sob medida. Finalizar como AWAITING_QUOTE e chamar no WhatsApp (62) 98124-4675.',
      };
    }
    if (mode === 'ENTREGA_LOCAL') {
      return { mode, carrier: 'FROTA_PROPRIA', price: 149.9, deadline_days: 7, message: 'Entrega + instalação Goiânia e região.' };
    }

    // FRETE_CALCULADO via Frenet — filtra só carga pesada
    const totalWeight = items.reduce((a, i) => a + i.weight_kg * i.quantity, 0);
    const res = await fetch('https://api.frenet.com.br/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: process.env.FRENET_TOKEN ?? '' },
      body: JSON.stringify({
        SellerCEP: (process.env.CEP_ORIGEM ?? '74000000').replace(/\D/g, ''),
        RecipientCEP: cep_destino.replace(/\D/g, ''),
        ShipmentInvoiceValue: 1000,
        ShippingItemArray: items.map((i) => ({
          Weight: Math.max(i.weight_kg, this.cubedWeight(i)),
          Length: i.length_cm, Height: i.height_cm, Width: i.width_cm, Quantity: i.quantity,
        })),
      }),
    });
    if (!res.ok) throw new Error(`Frenet: ${await res.text()}`);
    const data: any = await res.json();
    const services = (data?.ShippingSevicesArray ?? [])
      .filter((s: any) => /braspress|rodonaves|jadlog|jamef/i.test(s?.Carrier ?? s?.Transportadora ?? ''))
      .map((s: any) => ({ carrier: s.Carrier ?? s.Transportadora, price: Number(s.Price ?? s.ShippingPrice), deadline: s.DeliveryTime }));
    return { mode, totalWeight_kg: totalWeight, options: services, raw: data };
  }
}
