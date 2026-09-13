'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { CATALOG, quoteM2, Variant } from '../data/products';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Storefront() {
  const [largura, setLargura] = useState(2);
  const [altura, setAltura] = useState(2.5);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Estados de Lead e Checkout
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  
  // Etapa do modal: 'LEAD' -> 'SHIPPING' -> 'PAYMENT' -> 'SUCCESS'
  const [checkoutStep, setCheckoutStep] = useState<'LEAD' | 'SHIPPING' | 'PAYMENT' | 'SUCCESS'>('LEAD');
  
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', docNumber: '' });
  const [cep, setCep] = useState('');
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const finalPrice = selectedVariant ? quoteM2(selectedVariant.price_per_m2, largura, altura) : 0;

  // Curva ABC / Categorias Derivadas
  const categories = useMemo(() => ['Todas', ...Array.from(new Set(CATALOG.map(p => p.category)))], []);
  
  const filteredProducts = useMemo(() => {
    let prods = CATALOG;
    if (selectedCategory !== 'Todas') {
      prods = prods.filter(p => p.category === selectedCategory);
    }
    // Ordenar: Curva A primeiro, depois B, depois C
    return prods.sort((a, b) => a.curve.localeCompare(b.curve));
  }, [selectedCategory]);

  const handleBuy = (productName: string, variant: Variant) => {
    setSelectedProductName(productName);
    setSelectedVariant(variant);
    setCheckoutStep('LEAD');
    setPixData(null);
    setShippingQuotes([]);
  };

  const submitLead = async () => {
    if (!customer.name || !customer.phone || !customer.email) return alert('Preencha os dados básicos');
    setLoading(true);
    try {
      // Opcional: Rota /api/leads salva o cliente no Postgres aqui
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      }).catch(console.error); // Continua mesmo se der erro (fallback)
      
      setCheckoutStep('SHIPPING');
    } finally {
      setLoading(false);
    }
  };

  const calcShipping = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep,
          peso: 50,
          comprimento: largura * 100,
          altura: altura * 100,
          largura: 15
        })
      });
      const data = await res.json();
      if (data.quotes) setShippingQuotes(data.quotes);
    } catch (e) {
      alert('Erro ao calcular frete');
    }
    setLoading(false);
  };

  const generatePix = async () => {
    if (!selectedQuote) return alert('Selecione um frete primeiro');
    setLoading(true);
    try {
      const totalCost = finalPrice + selectedQuote.price;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customer,
          total: totalCost,
          shipping: selectedQuote,
          items: [{ name: selectedProductName, price: finalPrice }]
        })
      });
      const data = await res.json();
      setPixData(data);
      setCheckoutStep('SUCCESS');

      // Rastreamento: Compra (Geração do PIX)
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) (window as any).fbq('track', 'Purchase', { value: totalCost, currency: 'BRL' });
        if ((window as any).dataLayer) {
          (window as any).dataLayer.push({
            event: 'purchase',
            ecommerce: { transaction_id: data.orderId || new Date().getTime().toString(), value: totalCost, currency: 'BRL' }
          });
        }
      }
    } catch (e) {
      alert('Erro ao gerar PIX');
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* HEADER HERO */}
      <div className="bg-black text-white pt-16 pb-20 px-6 border-b-4 border-gold">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-montserrat text-4xl md:text-5xl font-bold mb-4">Soluções em Vidro e Alumínio</h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mb-8">
            Catálogo direto de fábrica. Calcule online e compre sob medida com entrega rastreada para todo o Brasil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 bg-white/10 p-6 rounded-xl border border-white/20 max-w-xl backdrop-blur-md">
            <label className="flex flex-col font-medium text-slate-100 w-full">
              Sua Largura (Metros)
              <input type="number" step="0.1" min="0.5" value={largura}
                className="mt-1 p-3 border border-transparent rounded-md bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-gold"
                onChange={(e) => setLargura(Number(e.target.value))} />
            </label>
            <label className="flex flex-col font-medium text-slate-100 w-full">
              Sua Altura (Metros)
              <input type="number" step="0.1" min="0.5" value={altura}
                className="mt-1 p-3 border border-transparent rounded-md bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-gold"
                onChange={(e) => setAltura(Number(e.target.value))} />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
        {/* SIDEBAR DE CATEGORIAS */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-10">
            <h3 className="font-montserrat font-bold text-lg mb-4 text-slate-800">Categorias</h3>
            <ul className="space-y-2">
              {categories.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === cat ? 'bg-gold text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* GRID DE PRODUTOS */}
        <main className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-montserrat text-2xl font-bold text-slate-800">
              {selectedCategory === 'Todas' ? 'Nosso Catálogo' : selectedCategory}
            </h2>
            <span className="text-slate-500 font-medium text-sm">{filteredProducts.length} produtos</span>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {filteredProducts.map((p) => (
              <article key={p.base_sku} className="border border-slate-200 rounded-2xl bg-white hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                {p.image && (
                  <div className="relative w-full h-56 bg-slate-100 overflow-hidden">
                    <Image 
                      src={p.image} 
                      alt={p.name} 
                      fill 
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        CURVA {p.curve}
                      </span>
                      {p.tags[0] && (
                        <span className="bg-gold/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                          {p.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="font-montserrat font-bold text-xl mb-1 text-slate-800">{p.name}</h2>
                  <p className="text-slate-500 mb-4 text-sm font-medium">A partir de {fmt(p.from_price_per_m2)}/m²</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {p.tags.map(t => (
                      <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{t}</span>
                    ))}
                  </div>

                  <ul className="space-y-4 flex-1">
                    {p.variants.map((v) => (
                      <li key={v.sku} className="text-sm p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between items-start gap-3 hover:border-gold/50 transition-colors">
                        <div className="text-slate-700">
                          {[v.aluminio, v.vidro, v.linha, v.modelo].filter(Boolean).join(' • ')}
                        </div>
                        {v.price_per_m2 > 0 && (
                          <div className="flex w-full justify-between items-center border-t border-slate-200 pt-3">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400 font-normal">Preço Final ({largura}×{altura}m)</span>
                              <span className="text-gold font-bold text-xl">{fmt(quoteM2(v.price_per_m2, largura, altura))}</span>
                            </div>
                            <button onClick={() => handleBuy(p.name, v)} className="bg-black text-white px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-black/20">
                              Comprar
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>

      {/* MODAL DE CHECKOUT MULTI-STEP */}
      {selectedVariant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col relative">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-montserrat text-slate-800">Finalizar Compra</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedProductName} ({largura}x{altura}m)</p>
              </div>
              <button onClick={() => setSelectedVariant(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-black transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              
              {/* ETAPA 1: Captura de Lead */}
              {checkoutStep === 'LEAD' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-gold/10 text-gold-dark p-4 rounded-xl mb-6">
                    <p className="font-bold text-sm">Identifique-se para calcular o frete e gerar seu orçamento formal.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                    <input type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                    <input type="text" placeholder="(62) 99999-9999" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent outline-none" />
                  </div>
                  <button onClick={submitLead} disabled={loading} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors mt-4">
                    {loading ? 'Salvando...' : 'Continuar para Entrega'}
                  </button>
                </div>
              )}

              {/* ETAPA 2: Frete */}
              {checkoutStep === 'SHIPPING' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Para onde vamos enviar?</label>
                    <div className="flex gap-2">
                      <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold outline-none" />
                      <button onClick={calcShipping} disabled={loading} className="bg-slate-800 px-6 rounded-lg font-bold text-white hover:bg-black transition-colors">
                        {loading ? '...' : 'Calcular'}
                      </button>
                    </div>
                  </div>

                  {shippingQuotes.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-slate-800">Transportadoras Disponíveis:</p>
                      {shippingQuotes.map((q, i) => (
                        <label key={i} className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedQuote === q ? 'border-gold bg-yellow-50' : 'border-slate-100 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-3">
                            <input type="radio" name="shipping" className="w-4 h-4 text-gold" checked={selectedQuote === q} onChange={() => setSelectedQuote(q)} />
                            <div>
                              <span className="block text-sm font-bold text-slate-800">{q.carrier}</span>
                              <span className="block text-xs text-slate-500">Entrega em {q.deadline} dias</span>
                            </div>
                          </div>
                          <span className="font-bold text-slate-900">{fmt(q.price)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedQuote && (
                    <button onClick={() => setCheckoutStep('PAYMENT')} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors">
                      Ir para Pagamento
                    </button>
                  )}
                </div>
              )}

              {/* ETAPA 3: Pagamento */}
              {checkoutStep === 'PAYMENT' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-slate-100 p-4 rounded-xl text-sm text-slate-700">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span className="font-bold">{fmt(finalPrice)}</span>
                    </div>
                    <div className="flex justify-between mb-4 border-b border-slate-200 pb-4">
                      <span>Frete ({selectedQuote.carrier})</span>
                      <span className="font-bold">{fmt(selectedQuote.price)}</span>
                    </div>
                    <div className="flex justify-between text-lg text-black font-bold">
                      <span>Total PIX</span>
                      <span className="text-gold">{fmt(finalPrice + selectedQuote.price)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF ou CNPJ para Nota Fiscal</label>
                    <input type="text" value={customer.docNumber} onChange={e => setCustomer({...customer, docNumber: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  
                  <button onClick={generatePix} disabled={loading} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors text-lg shadow-lg shadow-green-600/30">
                    {loading ? 'Gerando Pagamento...' : 'Concluir Pagamento PIX'}
                  </button>
                </div>
              )}

              {/* ETAPA 4: Sucesso PIX */}
              {checkoutStep === 'SUCCESS' && pixData && (
                <div className="text-center py-4 space-y-6 animate-fadeIn">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-2xl mb-2">Pedido Gerado!</h3>
                    <p className="text-slate-600">Copie o código abaixo e pague no aplicativo do seu banco para liberar a produção.</p>
                  </div>
                  
                  {pixData.mock && <div className="bg-yellow-100 text-yellow-800 text-sm px-4 py-2 rounded-lg font-bold">Modo Simulação (Sem chaves da API na Vercel)</div>}
                  
                  <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200 break-all text-sm font-mono text-slate-700 shadow-inner">
                    {pixData.pixCode}
                  </div>
                  
                  <button onClick={() => navigator.clipboard.writeText(pixData.pixCode)} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-black/20">
                    Copiar Código PIX
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
