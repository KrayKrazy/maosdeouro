// Catálogo real Mãos de Ouro — fonte: produtos maos de ouro.txt (Desktop)
// TODOS os preços são por m² e sob medida => type CUSTOM_PROJECT.
// Preço final = largura_m x altura_m x price_per_m2 da variante escolhida.

export type Variant = {
  sku: string;
  vidro?: string;
  aluminio?: string;
  ferragem?: string;
  linha?: string;
  modelo?: string;
  price_per_m2: number;
};

export type CatalogProduct = {
  name: string;
  base_sku: string;
  type: 'CUSTOM_PROJECT';
  unit: 'M2';
  from_price_per_m2: number;
  variants: Variant[];
};

export const CATALOG: CatalogProduct[] = [
  {
    name: 'Porta Imponente',
    base_sku: 'f4kveuwd5v',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 1159,
    variants: [
      { sku: 'f4kveuwd5v-preto', aluminio: 'Preto', linha: 'Suprema', price_per_m2: 1159 },
      { sku: 'f4kveuwd5v-cerejeira', aluminio: 'Cerejeira real', linha: 'Suprema', price_per_m2: 1989 },
    ],
  },
  {
    name: 'Porta de alumínio modelo veneziana',
    base_sku: 'urzc695e9q',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 1190,
    variants: [
      { sku: 'urzc695e9q', aluminio: 'Preto/Branco', linha: 'Suprema', vidro: 'Incolor', price_per_m2: 1190 },
    ],
  },
  {
    name: 'Fachada com ou sem Maxim-ar',
    base_sku: 's5ymoch333',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 1119,
    variants: [
      { sku: 's5ymoch333-refletivo', vidro: 'Refletivo', aluminio: 'Preto/Branco', linha: 'Suprema', price_per_m2: 1399 },
      { sku: 's5ymoch333-fume', vidro: 'Fumê', aluminio: 'Preto/Branco', linha: 'Suprema', price_per_m2: 1189 },
      { sku: 's5ymoch333-incolor', vidro: 'Incolor', aluminio: 'Preto/Branco', linha: 'Suprema', price_per_m2: 1119 },
    ],
  },
  {
    name: 'Pele de vidro',
    base_sku: 'jl9e7am350',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 1399,
    variants: [
      { sku: 'jl9e7am350', aluminio: 'Preto/Branco', vidro: 'Refletivo', linha: 'Ecostik', price_per_m2: 1399 },
    ],
  },
  {
    name: 'Porta de Correr — vidro temperado 8mm',
    base_sku: 'qxvqr55ajz',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 450,
    variants: [
      { sku: 'qxvqr55ajz-fume', vidro: 'Fumê', ferragem: 'Preto/Alumínio Fosco', price_per_m2: 460 },
      { sku: 'qxvqr55ajz-incolor', vidro: 'Incolor', ferragem: 'Preto/Alumínio Fosco', price_per_m2: 450 },
    ],
  },
  {
    name: 'Portão de alumínio',
    base_sku: '9vz8lmhkw6',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 899,
    variants: [
      { sku: '9vz8lmhkw6-vazado', aluminio: 'Preto/Branco/Alumínio Fosco', modelo: 'Vazado', price_per_m2: 899 },
      { sku: '9vz8lmhkw6-lambril', aluminio: 'Preto/Branco/Alumínio Fosco', modelo: 'Lambril', price_per_m2: 1100 },
    ],
  },
  {
    name: 'Porta de correr — sistema Light Holder',
    base_sku: 'pdxru91h4n',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 670,
    variants: [
      { sku: 'pdxru91h4n-incolor', vidro: 'Incolor 8mm', ferragem: 'Alumínio fosco/Preto', price_per_m2: 670 },
      { sku: 'pdxru91h4n-fume', vidro: 'Fumê 8mm', ferragem: 'Preto/Alumínio fosco', price_per_m2: 690 },
    ],
  },
  {
    name: 'Janela integrada — veneziana',
    base_sku: 'yx4f8hwx0c',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 1989,
    variants: [
      { sku: 'yx4f8hwx0c', aluminio: 'Cerejeira real', linha: 'Suprema', modelo: 'Veneziana', price_per_m2: 1989 },
    ],
  },
  {
    name: 'Espelho com LED, touch e lapidado',
    base_sku: '9530gh6836',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 599,
    variants: [{ sku: '9530gh6836', price_per_m2: 599 }],
  },
  {
    name: 'Porta de correr 2 folhas — esquadria + vidro',
    base_sku: 'hlbrc5wxrg',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 880,
    variants: [
      { sku: 'hlbrc5wxrg', aluminio: 'Preto', vidro: 'Incolor', linha: 'Suprema', price_per_m2: 880 },
    ],
  },
  {
    name: 'Espelho decorativo',
    base_sku: 'o9kmkb79h6',
    type: 'CUSTOM_PROJECT', unit: 'M2', from_price_per_m2: 0, // sem preço no txt — cotação manual
    variants: [{ sku: 'o9kmkb79h6', price_per_m2: 0 }],
  },
];

// Preço sob medida: área mínima faturável 1m² (padrão serralheria)
export function quoteM2(pricePerM2: number, largura_m: number, altura_m: number): number {
  if (pricePerM2 <= 0) return 0; // cotação manual
  const area = Math.max(largura_m * altura_m, 1);
  return Math.round(area * pricePerM2 * 100) / 100;
}
