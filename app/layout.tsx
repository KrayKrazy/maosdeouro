import type { Metadata } from 'next';
import './globals.css';
import { Montserrat, Roboto } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
const roboto = Roboto({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-roboto' });

export const metadata: Metadata = {
  title: 'Mão de Ouro Esquadrias de Alumínio | Alto Padrão',
  description:
    'Fabricação própria: projetos arquitetônicos de alto padrão, portas lambril, janelas integradas, fachadas pele de vidro. Exclusividade e sofisticação.',
  alternates: { canonical: 'https://maosdeouro.com.br/' },
  openGraph: {
    title: 'Mão de Ouro Esquadrias de Alumínio',
    description: 'Esquadrias de alumínio alto padrão + instalação premium.',
    locale: 'pt_BR',
    type: 'website',
  },
};

const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'Mão de Ouro Esquadrias de Alumínio',
  areaServed: ['Goiânia', 'Anápolis', 'Senador Canedo', 'São Paulo'],
  telephone: '+55-11-99999-9999',
  priceRange: '$$$',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${roboto.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-SEU-ID-AQUI');`,
          }}
        />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', 'SEU-PIXEL-AQUI');
            fbq('track', 'PageView');`,
          }}
        />
      </head>
      <body className="font-roboto bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black">
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-SEU-ID-AQUI" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}></iframe>
        </noscript>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=SEU-PIXEL-AQUI&ev=PageView&noscript=1" />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <header className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-[#D4AF37]/10">
          <nav aria-label="Principal" className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/images/logo.jpg" alt="Logo Mão de Ouro" className="h-10 w-auto rounded-md object-contain" />
              <span className="font-montserrat font-bold text-[#D4AF37] text-lg tracking-widest uppercase hidden md:block">Mão de Ouro Esquadrias de Alumínio</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="tel:11999999999" className="text-xs text-[#D4AF37] border border-[#D4AF37]/50 hover:bg-[#D4AF37] hover:text-black px-4 py-2 rounded-full transition-all uppercase tracking-wider hidden sm:block">
                SAC (11) 99999-9999
              </a>
              <a href="/cliente" className="text-xs text-gray-300 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-full transition-all uppercase tracking-wider">
                Painel do Cliente
              </a>
            </div>
          </nav>
        </header>
        <div className="h-16" />
        <main>{children}</main>
      </body>
    </html>
  );
}
