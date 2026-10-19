// Catálogo Mãos de Ouro Esquadrias — Modelo Super-Produtos (Medidas Padrão + Tipologias + Cubagem)
// Reestruturado conforme diretrizes da cliente (Pedido 1 + Transcrição de Áudio):
// - Fim da cobrança por m² / fora de padrão (100% Tamanho Padrão para otimizar logística, frete e mão de obra)
// - 4 Super-Produtos com tipologias, medidas padrão, cores, lado de abertura e metadados de cubagem (Altura, Largura, Profundidade, Peso Bruto)

export type StandardMeasure = {
  label: string;        // Ex: "210x80cm"
  width_cm: number;     // Largura em cm (ex: 80)
  height_cm: number;    // Altura em cm (ex: 210)
  depth_cm: number;     // Profundidade/Espessura da embalagem em cm (ex: 12)
  weight_kg: number;    // Peso bruto estimado em kg para cálculo de frete
  price_delta?: number; // Acréscimo de preço para medidas maiores (R$)
};

export type Variant = {
  id?: string;
  sku: string;
  tipologia: string;           // Ex: "Porta Postigo + Grade + Vidro (Mini Boreal)"
  uso: string;                 // Ex: "Cozinha / Área de Serviço"
  descricao?: string;          // Detalhes técnicos da tipologia
  price: number;               // Preço base da peça no tamanho padrão inicial (R$)
  price_per_m2?: number;       // Mantido opcional para retrocompatibilidade com banco legado
  cores: string[];             // Ex: ["Branco", "Preto", "Brilhante"]
  medidas: StandardMeasure[];  // Medidas padrão disponíveis para esta tipologia
  lados?: string[];            // Ex: ["Direita", "Esquerda"] (opcional, ex: espelhos não têm lado)
  folhas?: string;             // Ex: "2 Folhas", "3 Folhas", "4 Folhas"
  vidro?: string;
  aluminio?: string;
  linha?: string;
  modelo?: string;
  image?: string;              // Imagem específica da tipologia (opcional)
};

export type CatalogProduct = {
  id?: string;
  name: string;
  base_sku: string;
  type: 'SHIPPABLE' | 'CUSTOM_PROJECT';
  unit: 'UN';
  category: 'Portas' | 'Janelas' | 'Espelhos';
  subtitle: string;
  description: string;
  tags: string[];
  curve: 'A' | 'B' | 'C';
  from_price: number;
  from_price_per_m2?: number; // Retrocompatibilidade
  image: string;
  requires_install?: boolean;
  // Metadados padrão de cubagem do Super-Produto (fallback caso variante não especifique)
  weight_kg: number;
  length_cm: number; // Altura da embalagem (cm)
  width_cm: number;  // Largura da embalagem (cm)
  height_cm: number; // Profundidade/Espessura da embalagem (cm)
  variants: Variant[];
};

// ====== Opções Globais de Acabamento / Acessórios ======
export const LINHAS = ['Suprema', 'Gold', 'Atlanta'] as const;
export const ARREMATES = [
  'Sem arremate',
  'Guarnição / Alizar em Alumínio (+R$ 140)',
  'Perfil de acabamento + Silicone Estrutural (+R$ 95)',
] as const;

export const TAXA_INSTALACAO = 0.20; // +20% opcional para instalação técnica local (Goiânia e Região)

export const CATALOG: CatalogProduct[] = [
  // ============================================================================
  // 1. SUPER-PRODUTO: PORTAS DE ALUMÍNIO (CARRO-CHEFE)
  // ============================================================================
  {
    name: 'Portas de Alumínio — Linha Padrão Completa',
    base_sku: 'MDO-PORTAS-01',
    type: 'SHIPPABLE',
    unit: 'UN',
    category: 'Portas',
    subtitle: 'Postigo, Veneziana, Lambril com Puxador Inox e Basculante Mista',
    description:
      'Nosso carro-chefe em esquadrias de alumínio de alta resistência. Prontas para instalar (acompanham batente, dobradiças reforçadas, fechadura e chumbadores). Escolha a tipologia ideal para seu ambiente, cor, medida padrão e lado de abertura.',
    tags: ['Carro-Chefe', 'Mais Vendido', 'Pronta Entrega'],
    curve: 'A',
    from_price: 1190,
    image: '/images/porta imponente.jpg',
    requires_install: false,
    weight_kg: 32,
    length_cm: 215,
    width_cm: 95,
    height_cm: 12,
    variants: [
      {
        sku: 'PORTA-POSTIGO-MB',
        tipologia: 'Porta com Postigo + Grade + Vidro (Mini Boreal)',
        uso: 'Cozinha / Área de Serviço',
        descricao: 'Permite ventilação com a porta trancada através do postigo móvel, mantendo total segurança com grade integrada e privacidade com vidro Mini Boreal.',
        price: 1490,
        price_per_m2: 1490,
        cores: ['Branco', 'Preto', 'Brilhante'],
        lados: ['Direita (Abre p/ dentro à direita)', 'Esquerda (Abre p/ dentro à esquerda)'],
        vidro: 'Mini Boreal',
        linha: 'Suprema',
        image: '/images/porta de alumínio.webp',
        medidas: [
          { label: '210 x 80 cm', width_cm: 80, height_cm: 210, depth_cm: 12, weight_kg: 34, price_delta: 0 },
          { label: '210 x 90 cm', width_cm: 90, height_cm: 210, depth_cm: 12, weight_kg: 38, price_delta: 160 },
        ],
      },
      {
        sku: 'PORTA-VENEZIANA-PF',
        tipologia: 'Porta Veneziana de Alumínio (Palheta Fechada)',
        uso: 'Quarto / Corredor / Área Externa',
        descricao: 'Isolamento visual total com estrutura reforçada em palhetas fechadas de alumínio. Alta durabilidade contra sol e chuva.',
        price: 1190,
        price_per_m2: 1190,
        cores: ['Branco', 'Preto'],
        lados: ['Direita (Abre p/ dentro à direita)', 'Esquerda (Abre p/ dentro à esquerda)'],
        vidro: 'Sem Vidro (Cega)',
        linha: 'Suprema',
        image: '/images/porta de alumínio.webp',
        medidas: [
          { label: '210 x 70 cm', width_cm: 70, height_cm: 210, depth_cm: 10, weight_kg: 24, price_delta: 0 },
          { label: '210 x 80 cm', width_cm: 80, height_cm: 210, depth_cm: 10, weight_kg: 27, price_delta: 90 },
          { label: '210 x 90 cm', width_cm: 90, height_cm: 210, depth_cm: 10, weight_kg: 30, price_delta: 180 },
        ],
      },
      {
        sku: 'PORTA-LAMBRIL-INOX',
        tipologia: 'Porta Lambril em Alumínio com Puxador Inox',
        uso: 'Entrada Social / Sala',
        descricao: 'Design contemporâneo imponente em lambril duplo, acompanha puxador barra chata em Aço Inox polido/escovado e fechadura rolete de segurança.',
        price: 1890,
        price_per_m2: 1890,
        cores: ['Preto', 'Branco'],
        lados: ['Direita (Abre p/ dentro à direita)', 'Esquerda (Abre p/ dentro à esquerda)'],
        vidro: 'Opcional Friso',
        linha: 'Suprema',
        image: '/images/porta imponente.jpg',
        medidas: [
          { label: '210 x 90 cm', width_cm: 90, height_cm: 210, depth_cm: 12, weight_kg: 32, price_delta: 0 },
          { label: '210 x 100 cm', width_cm: 100, height_cm: 210, depth_cm: 12, weight_kg: 36, price_delta: 250 },
        ],
      },
      {
        sku: 'PORTA-BASCULANTE-MISTA',
        tipologia: 'Porta Basculante Mista (Alumínio + Vidro)',
        uso: 'Cozinha / Lavanderia',
        descricao: 'Metade inferior em lambril de alumínio fechado e metade superior com vidro e abertura basculante para circulação de ar e iluminação natural.',
        price: 1350,
        price_per_m2: 1350,
        cores: ['Branco', 'Preto'],
        lados: ['Direita (Abre p/ dentro à direita)', 'Esquerda (Abre p/ dentro à esquerda)'],
        vidro: 'Incolor / Mini Boreal',
        linha: 'Suprema',
        image: '/images/porta de correr.webp',
        medidas: [
          { label: '210 x 80 cm', width_cm: 80, height_cm: 210, depth_cm: 12, weight_kg: 31, price_delta: 0 },
          { label: '210 x 90 cm', width_cm: 90, height_cm: 210, depth_cm: 12, weight_kg: 35, price_delta: 140 },
        ],
      },
    ],
  },

  // ============================================================================
  // 2. SUPER-PRODUTO: JANELAS DE CORRER PADRÃO (2, 3 e 4 FOLHAS + VENEZIANA)
  // ============================================================================
  {
    name: 'Janelas de Correr em Alumínio — Linha Padrão',
    base_sku: 'MDO-JANELAS-CORRER-02',
    type: 'SHIPPABLE',
    unit: 'UN',
    category: 'Janelas',
    subtitle: '2 Folhas, 3 Folhas, 4 Folhas, Veneziana Simples e Integrada Automatizada',
    description:
      'Janelas de correr em tamanho padrão com roldanas blindadas de deslize macio e vedação acústica/hídrica em escova 3M. Disponíveis nas versões de correr simples, com veneziana ventilada ou persiana integrada blackout.',
    tags: ['Tamanho Padrão', 'Fácil Instalação', 'Acústica'],
    curve: 'A',
    from_price: 790,
    image: '/images/janela de alumínio veneziana.jpg',
    requires_install: false,
    weight_kg: 26,
    length_cm: 155,
    width_cm: 125,
    height_cm: 14,
    variants: [
      {
        sku: 'JAN-CORRER-2F-SIMPLES',
        tipologia: 'Janela de Correr Simples — 2 Folhas Móveis',
        uso: 'Sala / Cozinha / Escritório',
        descricao: 'Duas folhas móveis de vidro temperado/laminado com fecho concha embutido em alumínio.',
        price: 790,
        price_per_m2: 790,
        folhas: '2 Folhas',
        cores: ['Preto', 'Branco'],
        vidro: 'Incolor',
        linha: 'Suprema',
        medidas: [
          { label: '100 x 120 cm (Alt x Larg)', width_cm: 120, height_cm: 100, depth_cm: 12, weight_kg: 20, price_delta: 0 },
          { label: '100 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 100, depth_cm: 12, weight_kg: 24, price_delta: 160 },
          { label: '120 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 120, depth_cm: 12, weight_kg: 28, price_delta: 280 },
        ],
      },
      {
        sku: 'JAN-CORRER-3F-VENEZIANA',
        tipologia: 'Janela de Correr com Veneziana — 3 Folhas',
        uso: 'Quartos / Suítes',
        descricao: 'Duas folhas de veneziana em alumínio (ventilação e controle de luz) + uma folha de vidro incolor.',
        price: 1190,
        price_per_m2: 1190,
        folhas: '3 Folhas',
        cores: ['Preto', 'Branco'],
        vidro: 'Incolor',
        linha: 'Suprema',
        medidas: [
          { label: '100 x 120 cm (Alt x Larg)', width_cm: 120, height_cm: 100, depth_cm: 14, weight_kg: 25, price_delta: 0 },
          { label: '100 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 100, depth_cm: 14, weight_kg: 29, price_delta: 190 },
          { label: '120 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 120, depth_cm: 14, weight_kg: 33, price_delta: 340 },
        ],
      },
      {
        sku: 'JAN-CORRER-4F-SIMPLES',
        tipologia: 'Janela de Correr — 4 Folhas (2 Fixas + 2 Móveis)',
        uso: 'Salas Amplas / Varandas / Cozinhas',
        descricao: 'Abertura central ampla com duas folhas fixas laterais e duas folhas móveis centrais.',
        price: 1290,
        price_per_m2: 1290,
        folhas: '4 Folhas',
        cores: ['Preto', 'Branco'],
        vidro: 'Incolor',
        linha: 'Suprema',
        medidas: [
          { label: '100 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 100, depth_cm: 14, weight_kg: 28, price_delta: 0 },
          { label: '100 x 200 cm (Alt x Larg)', width_cm: 200, height_cm: 100, depth_cm: 14, weight_kg: 35, price_delta: 290 },
          { label: '120 x 200 cm (Alt x Larg)', width_cm: 200, height_cm: 120, depth_cm: 14, weight_kg: 40, price_delta: 450 },
        ],
      },
      {
        sku: 'JAN-VENEZIANA-INTEGRADA-AUTO',
        tipologia: 'Janela Veneziana Integrada Automatizada (Blackout)',
        uso: 'Suíte Master / Quartos',
        descricao: 'Persiana de enrolar integrada com acionamento por controle remoto / botoeira e lâminas preenchidas em poliuretano para 100% blecaute.',
        price: 2190,
        price_per_m2: 2190,
        folhas: '2 Folhas + Persiana Integrada',
        cores: ['Preto', 'Branco'],
        vidro: 'Incolor',
        linha: 'Suprema',
        medidas: [
          { label: '120 x 120 cm (Alt x Larg)', width_cm: 120, height_cm: 120, depth_cm: 18, weight_kg: 32, price_delta: 0 },
          { label: '120 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 120, depth_cm: 18, weight_kg: 38, price_delta: 350 },
        ],
      },
    ],
  },

  // ============================================================================
  // 3. SUPER-PRODUTO: JANELAS PIVOTANTES, MAXIM-AR & CAMARÃO
  // ============================================================================
  {
    name: 'Janelas Pivotantes, Maxim-ar & Camarão',
    base_sku: 'MDO-JANELAS-PIVOT-03',
    type: 'SHIPPABLE',
    unit: 'UN',
    category: 'Janelas',
    subtitle: 'Pivotante Padrão, Janela Camarão Articulada e Maxim-ar com Grade',
    description:
      'Soluções inteligentes de ventilação e estética arquitetônica em medidas padronizadas. Inclui a clássica Pivotante, a variação articulada Janela Camarão (abertura total do vão) e a Maxim-ar com grade para banheiros, cozinhas e salas.',
    tags: ['Ventilação Máxima', 'Articulada Camarão', 'Banheiro e Cozinha'],
    curve: 'B',
    from_price: 490,
    image: '/images/faixada com ou sem max-air.webp',
    requires_install: false,
    weight_kg: 18,
    length_cm: 120,
    width_cm: 100,
    height_cm: 12,
    variants: [
      {
        sku: 'JAN-PIVOTANTE-PADRAO',
        tipologia: 'Janela Pivotante Padrão em Alumínio',
        uso: 'Salas / Escadas / Lavabos',
        descricao: 'Giro sobre eixo vertical/horizontal com pivôs em aço inox e vedação perimetral.',
        price: 690,
        price_per_m2: 690,
        cores: ['Preto', 'Branco'],
        vidro: 'Incolor / Mini Boreal',
        linha: 'Suprema',
        medidas: [
          { label: '60 x 60 cm', width_cm: 60, height_cm: 60, depth_cm: 10, weight_kg: 10, price_delta: 0 },
          { label: '80 x 80 cm', width_cm: 80, height_cm: 80, depth_cm: 10, weight_kg: 14, price_delta: 150 },
          { label: '100 x 60 cm', width_cm: 60, height_cm: 100, depth_cm: 10, weight_kg: 13, price_delta: 120 },
        ],
      },
      {
        sku: 'JAN-CAMARAO-ARTICULADA',
        tipologia: 'Janela Camarão (Articulada — Abertura Total)',
        uso: ' Gourmet / Cozinha Integrada / Sala',
        descricao: 'Variação especial articulada que recolhe as folhas lateralmente, liberando quase 100% do vão livre.',
        price: 1590,
        price_per_m2: 1590,
        cores: ['Preto', 'Branco'],
        vidro: 'Incolor',
        linha: 'Suprema',
        medidas: [
          { label: '100 x 120 cm (Alt x Larg)', width_cm: 120, height_cm: 100, depth_cm: 15, weight_kg: 26, price_delta: 0 },
          { label: '100 x 150 cm (Alt x Larg)', width_cm: 150, height_cm: 100, depth_cm: 15, weight_kg: 32, price_delta: 280 },
          { label: '100 x 200 cm (Alt x Larg)', width_cm: 200, height_cm: 100, depth_cm: 15, weight_kg: 40, price_delta: 560 },
        ],
      },
      {
        sku: 'JAN-MAXIMAR-GRADE',
        tipologia: 'Janela Maxim-ar em Alumínio com Grade',
        uso: 'Banheiro, Cozinha e Sala',
        descricao: 'Abertura projetante externa com braço articulado de pressão e grade de proteção integrada.',
        price: 490,
        price_per_m2: 490,
        cores: ['Branco', 'Preto', 'Brilhante'],
        vidro: 'Mini Boreal / Incolor',
        linha: 'Suprema',
        medidas: [
          { label: '60 x 60 cm (Banheiro)', width_cm: 60, height_cm: 60, depth_cm: 10, weight_kg: 9, price_delta: 0 },
          { label: '60 x 80 cm (Banheiro/Cozinha)', width_cm: 80, height_cm: 60, depth_cm: 10, weight_kg: 12, price_delta: 90 },
          { label: '80 x 120 cm (Cozinha/Sala)', width_cm: 120, height_cm: 80, depth_cm: 12, weight_kg: 18, price_delta: 240 },
          { label: '100 x 200 cm (Módulo 2,00m x 1,00m)', width_cm: 200, height_cm: 100, depth_cm: 12, weight_kg: 30, price_delta: 590 },
        ],
      },
    ],
  },

  // ============================================================================
  // 4. SUPER-PRODUTO: ESPELHO LAPIDADO COM LED E TOUCH SCREEN
  // ============================================================================
  {
    name: 'Espelho Lapidado com LED e Botão Touch Screen',
    base_sku: 'MDO-ESPELHO-LED-04',
    type: 'SHIPPABLE',
    unit: 'UN',
    category: 'Espelhos',
    subtitle: 'Luz Quente (3000K) ou Luz Fria (6000K) — Medidas 80x60cm e 100x70cm',
    description:
      'Espelho Cebrace prata legítimo com bordas lapidadas de alta precisão, iluminação LED de alto brilho embutida e acionamento inteligente por botão Touch Screen no próprio vidro. Embalagem reforçada anti-impacto.',
    tags: ['Banheiros e Lavabos', 'Touch Screen', 'Pronta Entrega'],
    curve: 'A',
    from_price: 590,
    image: '/images/espelho personalizado.jpg',
    requires_install: false,
    weight_kg: 12,
    length_cm: 105,
    width_cm: 75,
    height_cm: 8,
    variants: [
      {
        sku: 'ESP-LED-3000K',
        tipologia: 'Espelho Lapidado LED — Luz Quente (3000K Aconchegante)',
        uso: 'Banheiros, Lavabos e Camarins',
        descricao: 'Iluminação indireta em tom Branco Quente (3000K) que valoriza a decoração e proporciona conforto visual, com botão Touch Screen.',
        price: 590,
        price_per_m2: 590,
        cores: ['Luz Quente (3000K)'],
        vidro: 'Espelho Prata 4mm Lapidado',
        medidas: [
          { label: '80 x 60 cm', width_cm: 60, height_cm: 80, depth_cm: 8, weight_kg: 9, price_delta: 0 },
          { label: '100 x 70 cm', width_cm: 70, height_cm: 100, depth_cm: 8, weight_kg: 13, price_delta: 190 },
        ],
      },
      {
        sku: 'ESP-LED-6000K',
        tipologia: 'Espelho Lapidado LED — Luz Fria (6000K Maquiagem/Barba)',
        uso: 'Banheiros, Lavabos e Suítes',
        descricao: 'Iluminação em tom Branco Frio (6000K) de alta definição, ideal para maquiagem e barbear, com acionamento Touch Screen.',
        price: 590,
        price_per_m2: 590,
        cores: ['Luz Fria (6000K)'],
        vidro: 'Espelho Prata 4mm Lapidado',
        medidas: [
          { label: '80 x 60 cm', width_cm: 60, height_cm: 80, depth_cm: 8, weight_kg: 9, price_delta: 0 },
          { label: '100 x 70 cm', width_cm: 70, height_cm: 100, depth_cm: 8, weight_kg: 13, price_delta: 190 },
        ],
      },
    ],
  },
];

// Helper de cálculo de preço unitário com medida padrão + opcionais
export function calculateStandardItemPrice(
  baseVariantPrice: number,
  measureDelta: number = 0,
  arremateStr: string = '',
  includesInstall: boolean = false
): {
  unitBasePrice: number;
  arrematePrice: number;
  installPrice: number;
  unitFinalPrice: number;
} {
  const unitBasePrice = Math.max(0, baseVariantPrice + (measureDelta || 0));
  let arrematePrice = 0;
  if (arremateStr.includes('+R$ 140')) arrematePrice = 140;
  else if (arremateStr.includes('+R$ 95')) arrematePrice = 95;

  const subtotal = unitBasePrice + arrematePrice;
  const installPrice = includesInstall ? Math.round(subtotal * TAXA_INSTALACAO * 100) / 100 : 0;
  const unitFinalPrice = Math.round((subtotal + installPrice) * 100) / 100;

  return { unitBasePrice, arrematePrice, installPrice, unitFinalPrice };
}

// Mantido por retrocompatibilidade caso algum módulo importe quoteM2
export function quoteM2(pricePerM2: number, largura_m: number, altura_m: number): number {
  if (pricePerM2 <= 0) return 0;
  const area = Math.max(largura_m * altura_m, 1);
  return Math.round(area * pricePerM2 * 100) / 100;
}
