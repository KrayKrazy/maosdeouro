import type { Metadata } from 'next';
import './globals.css';
import { Montserrat, Roboto } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
const roboto = Roboto({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-roboto' });

// ====== Contatos (substituir pelos dados reais da cliente) ======
const WHATSAPP_SAC = 'https://wa.me/5511999999999?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20meu%20pedido.';
const WHATSAPP_TECNICO = 'https://wa.me/5511988888888?text=Ol%C3%A1!%20Tenho%20d%C3%BAvidas%20sobre%20a%20instala%C3%A7%C3%A3o.';
const INSTAGRAM_URL = 'https://www.instagram.com/maosdeouro.esquadrias';
const FACEBOOK_URL = 'https://www.facebook.com/maosdeouroesquadrias';
const CONTACT_EMAIL = 'contato@maosdeouro.com.br';
const CONTACT_PHONE = '+55 (11) 99999-9999';

export const metadata: Metadata = {
  title: 'Mãos de Ouro Esquadrias de Alumínio | Alto Padrão',
  description:
    'Fabricação própria: esquadrias de alumínio de alto padrão nas linhas Gold, Suprema e Atlanta. Portas, janelas, fachadas pele de vidro e instalação premium.',
  alternates: { canonical: 'https://maosdeouro.com.br/' },
  openGraph: {
    title: 'Mãos de Ouro Esquadrias de Alumínio',
    description: 'Esquadrias de alumínio alto padrão + instalação premium.',
    locale: 'pt_BR',
    type: 'website',
  },
};

const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'Mãos de Ouro Esquadrias de Alumínio',
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
      <body className="font-roboto bg-[#0a0a0a] text-white selection:bg-[#D4AF37] selection:text-black">
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
        <header className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#D4AF37]/15">
          <nav aria-label="Principal" className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <a href="/" aria-label="Voltar para a página inicial" className="flex items-center gap-3 min-w-0 group">
              <img src="/images/logo.jpg" alt="Logo Mãos de Ouro Esquadrias de Alumínio" className="h-10 w-10 rounded-md object-contain shrink-0" />
              <span className="font-montserrat font-bold text-[#D4AF37] text-sm sm:text-lg tracking-widest uppercase leading-tight truncate">
                Mãos de Ouro <span className="hidden md:inline text-white/70 font-medium normal-case text-xs tracking-normal">Esquadrias de Alumínio</span>
              </span>
            </a>
            <div className="flex items-center gap-2 md:gap-3">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.5" y2="6.5" /></svg>
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Página no Facebook" title="Facebook" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} aria-label="E-mail" title="E-mail" className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              </a>
              <a href={`tel:${CONTACT_PHONE.replace(/[^\d+]/g, '')}`} className="hidden xl:flex items-center gap-2 text-xs text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-black px-3 py-2 rounded-full transition-all uppercase tracking-wider" title="Telefone fixo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                {CONTACT_PHONE}
              </a>
              <a href="/cliente" className="text-xs text-gray-200 hover:text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-black px-4 py-2 rounded-full transition-all uppercase tracking-wider font-semibold">
                Painel do Cliente
              </a>
            </div>
          </nav>
        </header>
        <div className="h-16" />
        <main>{children}</main>

        {/* RODAPÉ — redes sociais e contatos (sem o painel do cliente) */}
        <footer className="border-t border-[#D4AF37]/10 bg-[#0a0a0a] mt-16">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <a href="/" className="flex items-center gap-3">
                <img src="/images/logo.jpg" alt="Mãos de Ouro Esquadrias de Alumínio" className="h-10 w-10 rounded-md object-contain" />
                <span className="font-montserrat font-bold text-[#D4AF37] tracking-widest uppercase text-sm">Mãos de Ouro</span>
              </a>
              <p className="text-gray-400 text-sm mt-4 leading-relaxed">Esquadrias de alumínio de alto padrão. Fabricação própria, projetos sob medida e instalação premium.</p>
            </div>
            <div>
              <h4 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-4">Redes Sociais</h4>
              <div className="space-y-3 text-sm">
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-[#D4AF37] transition-colors">Instagram</a>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-[#D4AF37] transition-colors">Página no Facebook</a>
              </div>
            </div>
            <div>
              <h4 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-4">Contato</h4>
              <div className="space-y-3 text-sm text-gray-300">
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">{CONTACT_EMAIL}</a>
                <a href={`tel:${CONTACT_PHONE.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">{CONTACT_PHONE}</a>
                <a href={WHATSAPP_SAC} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#00B25A] hover:text-white transition-colors">WhatsApp — Reclamações, rastreio e dúvidas do produto</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 py-5 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Mãos de Ouro Esquadrias de Alumínio. Todos os direitos reservados.
          </div>
        </footer>
        {/* WhatsApp flutuante — SAC (reclamações, rastreio e dúvidas do produto) */}
        <a href={WHATSAPP_SAC} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de atendimento" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#00B25A] hover:bg-[#00924A] text-white font-bold text-sm pl-4 pr-5 py-3 rounded-full shadow-xl shadow-[#00B25A]/30 transition-all hover:-translate-y-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
          Fale com a gente
        </a>
      </body>
    </html>
  );
}
