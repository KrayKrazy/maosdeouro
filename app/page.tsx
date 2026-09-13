'use client';
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { CATALOG, quoteM2, Variant, CatalogProduct } from '../data/products';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Storefront() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Fluxo do Modal
  const [activeProduct, setActiveProduct] = useState<CatalogProduct | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'CONFIG' | 'LEAD' | 'SHIPPING' | 'PAYMENT' | 'SUCCESS' | null>(null);
  
  // Configuração do Produto
  const [largura, setLargura] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Checkout Dados
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', docNumber: '' });
  const [cep, setCep] = useState('');
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const finalPrice = selectedVariant && typeof largura === 'number' && typeof altura === 'number' 
    ? quoteM2(selectedVariant.price_per_m2, largura, altura) 
    : 0;

  // Derivar categorias
  const categories = useMemo(() => ['Todas', ...Array.from(new Set(CATALOG.map(p => p.category)))], []);
  
  const filteredProducts = useMemo(() => {
    let prods = CATALOG;
    if (selectedCategory !== 'Todas') prods = prods.filter(p => p.category === selectedCategory);
    return prods.sort((a, b) => a.curve.localeCompare(b.curve));
  }, [selectedCategory]);

  const openProduct = (p: CatalogProduct) => {
    setActiveProduct(p);
    setSelectedVariant(p.variants[0]);
    setLargura('');
    setAltura('');
    setCheckoutStep('CONFIG');
  };

  const closeModal = () => {
    setActiveProduct(null);
    setCheckoutStep(null);
    setPixData(null);
    setShippingQuotes([]);
  };

  const proceedToLead = () => {
    if (typeof largura !== 'number' || typeof altura !== 'number' || largura <= 0 || altura <= 0) {
      return alert('Informe as medidas válidas da esquadria (Largura e Altura).');
    }
    setCheckoutStep('LEAD');
  };

  const submitLead = async () => {
    if (!customer.name || !customer.phone || !customer.email) return alert('Preencha os dados básicos');
    setLoading(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      }).catch(console.error);
      setCheckoutStep('SHIPPING');
    } finally {
      setLoading(false);
    }
  };

  const [address, setAddress] = useState({
    street: '', neighborhood: '', city: '', state: '', number: '', complement: '', reference: ''
  });

  const calcShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length < 8) return alert('CEP inválido');

    setLoading(true);
    try {
      // 1. Busca Frete
      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: cleanCep,
          peso: 50,
          comprimento: (largura as number) * 100,
          altura: (altura as number) * 100,
          largura: 15
        })
      });
      const data = await res.json();
      if (data.quotes) setShippingQuotes(data.quotes);

      // 2. Busca Endereço
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const viaCepData = await viaCepRes.json();
      if (!viaCepData.erro) {
        setAddress(prev => ({
          ...prev, 
          street: viaCepData.logradouro, 
          neighborhood: viaCepData.bairro, 
          city: viaCepData.localidade, 
          state: viaCepData.uf
        }));
      }
    } catch (e) {
      alert('Erro ao calcular frete ou buscar endereço');
    }
    setLoading(false);
  };

  // Novo Estado de Pagamento
  const [paymentMethod, setPaymentMethod] = useState<'pix'|'credit_card'>('pix');
  const [installments, setInstallments] = useState<number>(1);
  const [card, setCard] = useState({ number: '', holderName: '', expMonth: '', expYear: '', cvv: '' });

  const submitPayment = async () => {
    if (!selectedQuote) return alert('Selecione um frete primeiro');
    
    // Validação de Cartão
    if (paymentMethod === 'credit_card') {
      if (!card.number || !card.holderName || !card.expMonth || !card.expYear || !card.cvv) {
        return alert('Preencha todos os dados do cartão.');
      }
    }

    setLoading(true);
    try {
      const totalCost = finalPrice + selectedQuote.price;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customer,
          address,
          total: totalCost,
          shipping: selectedQuote,
          items: [{ name: activeProduct?.name, price: finalPrice }],
          paymentMethod,
          installments,
          card: paymentMethod === 'credit_card' ? card : undefined
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
         alert(data.error || 'Falha ao processar pagamento.');
         setLoading(false);
         return;
      }

      setPixData(data);
      setCheckoutStep('SUCCESS');

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
      alert('Erro de conexão ao processar pagamento.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#FAFAFA] min-h-screen font-roboto text-slate-900 pb-24">
      {/* HEADER / NAV - Estilo Boutique */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex gap-4 items-center">
            <img src="/images/logo.jpg" alt="Logo Mãos de Ouro" className="h-10 w-auto rounded object-contain" />
            <h1 className="font-montserrat text-xl font-bold tracking-tight uppercase text-black">Mãos de Ouro</h1>
          </div>
          <nav className="flex gap-2 sm:gap-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap text-sm font-medium transition-colors uppercase tracking-widest px-2 py-1 border-b-2 ${
                  selectedCategory === cat ? 'border-gold text-black' : 'border-transparent text-slate-400 hover:text-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* CATALOGO - Grid Clean e Altamente Conversível */}
      <main className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-montserrat text-3xl font-bold tracking-tight text-black">{selectedCategory === 'Todas' ? 'Coleção Completa' : selectedCategory}</h2>
            <p className="text-slate-500 mt-2 text-sm">Fabricação própria sob medida com entrega para todo o Brasil.</p>
          </div>
          <span className="text-slate-400 text-sm hidden sm:block">{filteredProducts.length} produtos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
          {filteredProducts.map((p) => (
            <div key={p.base_sku} className="group cursor-pointer flex flex-col" onClick={() => openProduct(p)}>
              <div className="relative w-full aspect-[4/5] bg-slate-100 mb-4 overflow-hidden rounded-sm">
                {p.image ? (
                  <Image 
                    src={p.image} 
                    alt={p.name} 
                    fill 
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">Sem Foto</div>
                )}
                
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {p.curve === 'A' && <span className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Mais Vendido</span>}
                  {p.tags[0] && <span className="bg-gold text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest shadow-sm">{p.tags[0]}</span>}
                </div>

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <span className="bg-white text-black font-bold uppercase tracking-wider text-xs px-6 py-3 rounded shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    Configurar Medidas
                  </span>
                </div>
              </div>

              <h3 className="font-montserrat font-bold text-base text-black leading-snug group-hover:text-gold transition-colors line-clamp-2">
                {p.name}
              </h3>
              <p className="text-slate-500 text-sm mt-1">A partir de {fmt(p.from_price_per_m2)}/m²</p>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL MULTI-STEP (CONFIGURADOR -> CHECKOUT) */}
      {activeProduct && checkoutStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-5xl md:rounded-xl shadow-2xl h-full md:h-[85vh] flex flex-col md:flex-row overflow-hidden relative">
            
            <button onClick={closeModal} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 md:bg-slate-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              ✕
            </button>

            <div className="hidden md:block md:w-1/2 relative bg-slate-100">
              {activeProduct.image && (
                <Image src={activeProduct.image} alt={activeProduct.name} fill className="object-cover" />
              )}
            </div>

            <div className="w-full md:w-1/2 flex flex-col h-full overflow-y-auto bg-white">
              
              <div className="p-6 md:p-10 border-b border-slate-100">
                <div className="text-xs text-gold font-bold uppercase tracking-widest mb-2">{activeProduct.category}</div>
                <h2 className="font-montserrat text-2xl font-bold text-black leading-tight">{activeProduct.name}</h2>
              </div>

              <div className="p-6 md:p-10 flex-1">
                
                {/* PASSO 1: CONFIGURADOR */}
                {checkoutStep === 'CONFIG' && (
                  <div className="space-y-8 animate-fadeIn">
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-4">1. Informe as Medidas</h4>
                      <div className="flex gap-4">
                        <label className="flex-1">
                          <span className="block text-xs text-slate-500 mb-1">Largura (Metros)</span>
                          <input type="number" step="0.1" min="0.1" value={largura} onChange={e => setLargura(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 2.0" className="w-full p-3 border border-slate-200 rounded focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all" />
                        </label>
                        <label className="flex-1">
                          <span className="block text-xs text-slate-500 mb-1">Altura (Metros)</span>
                          <input type="number" step="0.1" min="0.1" value={altura} onChange={e => setAltura(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 2.5" className="w-full p-3 border border-slate-200 rounded focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-4">2. Acabamento</h4>
                      <div className="space-y-3">
                        {activeProduct.variants.map((v) => (
                          <label 
                            key={v.sku} 
                            onClick={() => setSelectedVariant(v)}
                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all shadow-sm ${selectedVariant?.sku === v.sku ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedVariant?.sku === v.sku ? 'border-black' : 'border-slate-300'}`}>
                                {selectedVariant?.sku === v.sku && <div className="w-2 h-2 bg-black rounded-full" />}
                              </div>
                              <span className="text-sm font-medium text-slate-700">
                                {[v.aluminio, v.vidro, v.linha].filter(Boolean).join(' • ')}
                              </span>
                            </div>
                            <span className="text-sm font-bold">{fmt(v.price_per_m2)}/m²</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 text-sm">Valor Estimado</span>
                        <span className="font-montserrat font-bold text-2xl text-black">
                          {finalPrice > 0 ? fmt(finalPrice) : '---'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 text-right">Não inclui frete e instalação</p>
                    </div>

                    <button 
                      onClick={proceedToLead} 
                      className="w-full bg-black text-white uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gold hover:text-black transition-all"
                    >
                      Continuar Compra
                    </button>
                  </div>
                )}

                {/* PASSO 2: LEAD CAPTURE */}
                {checkoutStep === 'LEAD' && (
                  <div className="space-y-6 animate-scaleUp">
                    <button onClick={() => setCheckoutStep('CONFIG')} className="text-xs text-slate-400 hover:text-black uppercase tracking-widest font-bold mb-4 flex items-center gap-1 transition-colors">← Voltar</button>
                    
                    <div>
                      <h3 className="font-montserrat font-bold text-xl text-black">Seus Dados</h3>
                      <p className="text-sm text-slate-500 mt-1">Para calcularmos o frete e emitirmos o pedido, precisamos te conhecer.</p>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nome Completo</label>
                        <input 
                          type="text" 
                          value={customer.name} 
                          onChange={e => setCustomer({...customer, name: e.target.value})} 
                          className="w-full p-3.5 border border-slate-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm hover:border-slate-300"
                          placeholder="Digite seu nome"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">E-mail Principal</label>
                        <input 
                          type="email" 
                          value={customer.email} 
                          onChange={e => setCustomer({...customer, email: e.target.value})} 
                          className="w-full p-3.5 border border-slate-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm hover:border-slate-300"
                          placeholder="voce@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">WhatsApp</label>
                        <input 
                          type="text" 
                          value={customer.phone} 
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.slice(0, 11);
                            if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                            else if (v.length > 5) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
                            else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
                            setCustomer({...customer, phone: v});
                          }} 
                          className="w-full p-3.5 border border-slate-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm hover:border-slate-300"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <button onClick={() => {
                      if (!customer.name || customer.name.length < 3) return alert('Por favor, informe seu nome completo.');
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(customer.email)) return alert('Por favor, informe um e-mail válido.');
                      if (customer.phone.replace(/\D/g, '').length < 10) return alert('Por favor, informe um WhatsApp válido com DDD.');
                      submitLead();
                    }} disabled={loading} className="w-full bg-black text-white uppercase tracking-widest font-bold text-sm py-4 rounded-lg hover:bg-gold hover:text-black hover:-translate-y-1 hover:shadow-xl transition-all duration-300 mt-6 flex items-center justify-center gap-2">
                      {loading ? 'Processando...' : 'Ir para Entrega →'}
                    </button>
                  </div>
                )}

                {/* PASSO 3: FRETE */}
                {checkoutStep === 'SHIPPING' && (
                  <div className="space-y-6 animate-fadeIn">
                    <button onClick={() => setCheckoutStep('LEAD')} className="text-xs text-slate-400 hover:text-black uppercase tracking-widest font-bold mb-4 flex items-center gap-1">← Voltar</button>
                    
                    <h3 className="font-montserrat font-bold text-xl text-black">Entrega (Frenet)</h3>
                    
                    <div className="flex gap-2">
                      <input type="text" value={cep} onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 8) v = v.slice(0, 8);
                        if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3}).*/, '$1-$2');
                        setCep(v);
                      }} placeholder="CEP (00000-000)" className="flex-1 p-3.5 border border-slate-200 rounded-lg focus:border-black outline-none shadow-sm" />
                      <button onClick={calcShipping} disabled={loading} className="bg-slate-200 px-6 rounded-lg font-bold text-slate-700 hover:bg-slate-300 transition-colors shadow-sm">
                        {loading ? '...' : 'Buscar'}
                      </button>
                    </div>

                    {shippingQuotes.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        {shippingQuotes.map((q, i) => (
                          <label key={i} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all shadow-sm ${selectedQuote === q ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" className="accent-black" checked={selectedQuote === q} onChange={() => setSelectedQuote(q)} />
                              <div>
                                <span className="block text-sm font-bold">{q.carrier}</span>
                                <span className="block text-xs text-slate-500">{q.deadline} dias úteis</span>
                              </div>
                            </div>
                            <span className="font-bold">{fmt(q.price)}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {shippingQuotes.length > 0 && address.street && (
                      <div className="space-y-4 pt-4 border-t border-slate-100 animate-slideUp">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800">Endereço de Entrega</h4>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <p className="text-sm font-medium text-black">{address.street}, {address.neighborhood}</p>
                          <p className="text-sm text-slate-600">{address.city} - {address.state}</p>
                        </div>

                        <div className="flex gap-4">
                          <div className="w-1/3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Número</label>
                            <input type="text" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} className="w-full p-3.5 border border-slate-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm" placeholder="123" />
                          </div>
                          <div className="w-2/3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Complemento (Opcional)</label>
                            <input type="text" value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} className="w-full p-3.5 border border-slate-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm" placeholder="Apto, Bloco..." />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ponto de Referência (Opcional)</label>
                          <input type="text" value={address.reference} onChange={e => setAddress({...address, reference: e.target.value})} className="w-full p-3.5 border border-slate-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm" placeholder="Próximo a..." />
                        </div>
                      </div>
                    )}

                    {selectedQuote && (
                      <button onClick={() => {
                        if (address.street && !address.number) return alert('Por favor, informe o número da residência.');
                        setCheckoutStep('PAYMENT');
                      }} className="w-full bg-black text-white uppercase tracking-widest font-bold text-sm py-4 rounded-lg hover:bg-gold hover:text-black hover:-translate-y-1 hover:shadow-xl transition-all duration-300 mt-6 flex items-center justify-center gap-2">
                        Confirmar Frete e Endereço →
                      </button>
                    )}
                  </div>
                )}

                {/* PASSO 4: PAGAMENTO */}
                {checkoutStep === 'PAYMENT' && (
                  <div className="space-y-6 animate-fadeIn">
                    <button onClick={() => setCheckoutStep('SHIPPING')} className="text-xs text-slate-400 hover:text-black uppercase tracking-widest font-bold mb-4 flex items-center gap-1">← Voltar</button>
                    
                    <h3 className="font-montserrat font-bold text-xl text-black">Pagamento</h3>
                    
                    {/* Resumo */}
                    <div className="bg-slate-50 p-4 rounded border border-slate-100 space-y-2 text-sm mb-6">
                      <div className="flex justify-between text-slate-600">
                        <span>Produto</span><span>{fmt(finalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-2">
                        <span>Frete</span><span>{fmt(selectedQuote.price)}</span>
                      </div>
                      <div className="flex justify-between text-black font-bold text-lg pt-2">
                        <span>Total</span><span className="text-gold">{fmt(finalPrice + selectedQuote.price)}</span>
                      </div>
                    </div>

                    {/* TABS DE PAGAMENTO */}
                    <div className="flex border-b border-slate-200 mb-6">
                      <button onClick={() => setPaymentMethod('pix')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider ${paymentMethod === 'pix' ? 'border-b-2 border-black text-black' : 'text-slate-400'}`}>PIX (10% OFF)</button>
                      <button onClick={() => setPaymentMethod('credit_card')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider ${paymentMethod === 'credit_card' ? 'border-b-2 border-black text-black' : 'text-slate-400'}`}>Cartão de Crédito</button>
                    </div>

                    {/* DADOS FISCAIS COMUNS */}
                    <div className="mb-6">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">CPF / CNPJ (Nota Fiscal)</label>
                      <input type="text" value={customer.docNumber} onChange={e => setCustomer({...customer, docNumber: e.target.value})} className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none" />
                    </div>

                    {/* FORMULÁRIO DE CARTÃO */}
                    {paymentMethod === 'credit_card' && (
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Número do Cartão</label>
                          <input type="text" value={card.number} onChange={e => setCard({...card, number: e.target.value})} placeholder="0000 0000 0000 0000" className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nome Impresso no Cartão</label>
                          <input type="text" value={card.holderName} onChange={e => setCard({...card, holderName: e.target.value})} className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mês (MM)</label>
                            <input type="text" maxLength={2} value={card.expMonth} onChange={e => setCard({...card, expMonth: e.target.value})} placeholder="12" className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ano (AA)</label>
                            <input type="text" maxLength={2} value={card.expYear} onChange={e => setCard({...card, expYear: e.target.value})} placeholder="29" className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none" />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">CVV</label>
                            <input type="text" maxLength={4} value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} placeholder="123" className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Parcelamento</label>
                          <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full p-3 border border-slate-200 rounded focus:border-black outline-none bg-white">
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                              <option key={num} value={num}>{num}x de {fmt((finalPrice + selectedQuote.price) / num)} s/ juros</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    
                    <button onClick={submitPayment} disabled={loading} className="w-full bg-[#00B25A] text-white uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-[#00924A] transition-all">
                      {loading ? 'Processando...' : paymentMethod === 'pix' ? 'Gerar PIX' : 'Pagar com Cartão'}
                    </button>
                    <div className="text-center text-xs text-slate-400 mt-3">🔒 100% Seguro via Cakto Pay</div>
                  </div>
                )}

                {/* PASSO 5: SUCESSO PIX / CARTÃO */}
                {checkoutStep === 'SUCCESS' && pixData && (
                  <div className="text-center py-8 space-y-6 animate-fadeIn">
                    <div className="w-20 h-20 bg-green-50 text-[#00B25A] rounded-full flex items-center justify-center mx-auto text-4xl border border-green-100">✓</div>
                    
                    {pixData.pixCode ? (
                      // TELA DE SUCESSO - PIX
                      <>
                        <div>
                          <h3 className="font-montserrat font-bold text-2xl text-black mb-2">Pix Gerado!</h3>
                          <p className="text-slate-500 text-sm max-w-xs mx-auto">Copie o código abaixo e pague no app do seu banco. A confirmação é instantânea.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 break-all text-xs font-mono text-slate-600">
                          {pixData.pixCode}
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(pixData.pixCode)} className="w-full bg-black text-white uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gold hover:text-black transition-all">
                          Copiar Código PIX
                        </button>
                      </>
                    ) : (
                      // TELA DE SUCESSO - CARTÃO
                      <>
                        <div>
                          <h3 className="font-montserrat font-bold text-2xl text-black mb-2">Pedido Aprovado!</h3>
                          <p className="text-slate-500 text-sm max-w-xs mx-auto">O pagamento via cartão de crédito foi confirmado com sucesso e seu pedido já está em andamento.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm font-bold text-slate-600">
                          ID do Pedido: {pixData.orderId}
                        </div>
                        <button onClick={closeModal} className="w-full bg-black text-white uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gold hover:text-black transition-all">
                          Voltar para a Loja
                        </button>
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
