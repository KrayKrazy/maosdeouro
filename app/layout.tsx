import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mãos de Ouro | Serralheria e Vidraçaria em Goiânia — Portões, Janelas, Fachadas',
  description:
    'Fabricação própria em Goiânia: portões de correr, portas lambril, janelas integradas, fachadas pele de vidro. Linhas Gold, Suprema e Ecoline. Orçamento grátis.',
  alternates: { canonical: 'https://maosdeouro.com.br/' },
  openGraph: {
    title: 'Mãos de Ouro — Serralheria e Vidraçaria',
    description: 'Esquadrias de alumínio alto padrão + instalação em Goiânia e região.',
    locale: 'pt_BR',
    type: 'website',
  },
};

const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'Mãos de Ouro Serralheria e Vidraçaria',
  areaServed: ['Goiânia', 'Anápolis', 'Senador Canedo'],
  telephone: '+55-62-98124-4675',
  priceRange: '$$',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <header>
          <nav aria-label="Principal">MÃOS DE OURO — Goiânia</nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
