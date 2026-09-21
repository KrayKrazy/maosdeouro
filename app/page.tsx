'use client';
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { quoteM2, Variant, CatalogProduct } from '../data/products';
import { supabase } from '@/lib/supabase';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Storefront() {

  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({data}) => {
          if(data) setUserProfile(data);
        });
      }
    });
  }, []);
  useEffect(() => {
    async function loadCatalog() {
      const { data, error } = await supabase.from('products').select('*, variants(*)').order('name');
      if (data) {
        // Map the image_url to image and variants array
        const formatted = data.map(p => ({
          ...p,
          image: p.image_url,
          from_price_per_m2: Math.min(...p.variants.map((v: any) => v.price_per_m2))
        }));
        setCatalog(formatted as any);
      }
      setLoadingCatalog(false);
    }
    loadCatalog();
  }, []);

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
  const [includesInstallation, setIncludesInstallation] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'LOGIN'|'REGISTER'>('REGISTER');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

    let finalPrice = selectedVariant && typeof largura === 'number' && typeof altura === 'number' 
    ? quoteM2(selectedVariant.price_per_m2, largura, altura) 
    : 0;

  if (finalPrice > 0 && includesInstallation) {
    // Adiciona 25% de taxa de servi�o/instala��o
    finalPrice = finalPrice * 1.25;
  }

  // Derivar categorias
  const categories = useMemo(() => ['Todas', ...Array.from(new Set(catalog.map(p => p.category)))], []);
  
  const filteredProducts = useMemo(() => {
    let prods = catalog;
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
    // 1. Salvar no Supabase Orders
    if (userProfile) {
      await supabase.from('orders').insert({
        user_id: userProfile.id,
        items: [{ product: activeProduct.name, variant: selectedVariant, width: largura, height: altura, price: finalPrice }],
        total_price: finalPrice,
        includes_installation: includesInstallation
      });
    }
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
    <div className="bg-[#050505] min-h-screen font-roboto text-white pb-24">
      {/* HEADER / NAV - Estilo Boutique */}
      {/* CATALOGO - Grid Clean e Altamente Conversível */}
      
      {/* HERO SECTION PREMIUM */}
      <div className="relative w-full h-[60vh] bg-[#050505] flex items-center justify-center overflow-hidden border-b border-[#D4AF37]/10">
        <div className="absolute inset-0 bg-[url('/images/lux-bg.jpg')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 text-center flex flex-col items-center px-4"
        >
          <div className="w-16 h-[1px] bg-[#D4AF37] mb-6"></div>
          <h1 className="font-serif text-5xl md:text-7xl text-white font-light tracking-tight mb-4">
            Mãos de <span className="text-[#D4AF37] font-semibold italic">Ouro</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base tracking-[0.2em] uppercase max-w-xl leading-relaxed">
            A excelência do sob medida. Exclusividade e sofisticação em cada detalhe da sua esquadria.
          </p>
          <div className="w-16 h-[1px] bg-[#D4AF37] mt-8"></div>
        </motion.div>
      </div>

      
      {/* SE��O BENTO GRID - DIFERENCIAIS (Extra�do de 21st MCP) */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold">O padrão Mãos de Ouro</span>
          <h2 className="font-serif text-3xl md:text-4xl text-white mt-3">Por que somos diferentes?</h2>
        </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
          <motion.div
            className="md:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1"></div>
            <div className="relative z-10">
              <h3 className="font-serif text-2xl text-white font-medium">Fabricação Própria</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Controle total de qualidade. Cortamos, montamos e instalamos sem terceirização, garantindo o padrão Classe A em cada milímetro.</p>
            </div>
          </motion.div>

          <motion.div
            className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1 flex justify-end flex-col">
              <h3 className="font-serif text-2xl text-[#D4AF37] font-medium">Linha Gold</h3>
              <p className="text-gray-400 text-sm mt-2">Estruturas robustas que suportam vidros de grande porte com deslizamento suave.</p>
            </div>
          </motion.div>

          <motion.div
            className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 0.99 }}
          >
             <div className="absolute inset-0 bg-[url('/images/lux-bg.jpg')] bg-cover opacity-5 group-hover:opacity-10 transition-opacity mix-blend-luminosity"></div>
            <div className="flex-1 flex justify-end flex-col relative z-10">
              <h3 className="font-serif text-2xl text-white font-medium">Design Minimalista</h3>
              <p className="text-gray-400 text-sm mt-2">Perfis ocultos e integração total com o seu projeto arquitetônico.</p>
            </div>
          </motion.div>

          <motion.div
            className="md:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 bg-gradient-to-tl from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1"></div>
            <div className="relative z-10">
              <h3 className="font-serif text-2xl text-white font-medium">Garantia de Instalação</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Nossa equipe de engenharia garante que sua esquadria nunca sairá do prumo ou apresentará vazamentos.</p>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 pt-12" id="catalogo">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white">{selectedCategory === 'Todas' ? 'Coleção Completa' : selectedCategory}</h2>
            <p className="text-gray-400 mt-2 text-sm">Fabricação própria sob medida com entrega para todo o Brasil.</p>
          </div>
          <span className="text-gray-500 text-sm hidden sm:block">{filteredProducts.length} produtos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
          {filteredProducts.map((p) => (
            <div key={p.base_sku} className="group cursor-pointer flex flex-col" onClick={() => openProduct(p)}>
              <div className="relative w-full aspect-[4/5] bg-[#111] mb-4 overflow-hidden rounded-sm">
                {p.image ? (
                  <Image 
                    src={p.image} 
                    alt={p.name} 
                    fill 
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">Sem Foto</div>
                )}
                
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {p.curve === 'A' && <span className="bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold border-none text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Mais Vendido</span>}
                  {p.tags[0] && <span className="bg-gold text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest shadow-sm">{p.tags[0]}</span>}
                </div>

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <span className="bg-[#0a0a0a] text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    Configurar Medidas
                  </span>
                </div>
              </div>

              <h3 className="font-serif font-bold text-base text-white leading-snug group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                {p.name}
              </h3>
              <p className="text-gray-400 text-sm mt-1">A partir de {fmt(p.from_price_per_m2)}/m²</p>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL MULTI-STEP (CONFIGURADOR -> CHECKOUT) */}
      {activeProduct && checkoutStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0a0a0a] w-full max-w-5xl md:rounded-xl shadow-2xl h-full md:h-[85vh] flex flex-col md:flex-row overflow-hidden relative">
            
            <button onClick={closeModal} className="absolute top-4 right-4 z-10 w-10 h-10 bg-[#0a0a0a]/80 md:bg-[#111] rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              ✕
            </button>

            <div className="hidden md:block md:w-1/2 relative bg-[#111]">
              {activeProduct.image && (
                <Image src={activeProduct.image} alt={activeProduct.name} fill className="object-cover" />
              )}
            </div>

            <div className="w-full md:w-1/2 flex flex-col h-full overflow-y-auto bg-[#0a0a0a]">
              
              <div className="p-6 md:p-10 border-b border-slate-100">
                <div className="text-xs text-gold font-bold uppercase tracking-widest mb-2">{activeProduct.category}</div>
                <h2 className="font-serif text-2xl font-bold text-white leading-tight">{activeProduct.name}</h2>
              </div>

              <div className="p-6 md:p-10 flex-1">
                
                {/* PASSO 1: CONFIGURADOR */}
                {checkoutStep === 'CONFIG' && (
                  <div className="space-y-8 animate-fadeIn">
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-4">1. Informe as Medidas</h4>
                      <div className="flex gap-4">
                        <label className="flex-1">
                          <span className="block text-xs text-gray-400 mb-1">Largura (Metros)</span>
                          <input type="number" step="0.1" min="0.1" value={largura} onChange={e => setLargura(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 2.0" className="w-full p-3 border border-white/10 rounded focus:border-gold focus:ring-1 focus:ring-gold outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                        </label>
                        <label className="flex-1">
                          <span className="block text-xs text-gray-400 mb-1">Altura (Metros)</span>
                          <input type="number" step="0.1" min="0.1" value={altura} onChange={e => setAltura(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 2.5" className="w-full p-3 border border-white/10 rounded focus:border-gold focus:ring-1 focus:ring-gold outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
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
                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all shadow-sm ${selectedVariant?.sku === v.sku ? 'border-black bg-[#1a1a1a]' : 'border-white/10 hover:border-white/20'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedVariant?.sku === v.sku ? 'border-black' : 'border-white/20'}`}>
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

                    <div className="bg-[#1a1a1a] p-6 rounded border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Valor Estimado</span>
                        <span className="font-serif font-bold text-2xl text-white">
                          {finalPrice > 0 ? fmt(finalPrice) : '---'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 text-right">Não inclui frete e instalação</p>
                    </div>

                    <button 
                      onClick={proceedToLead} 
                      className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold border-none uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gold hover:text-white transition-all"
                    >
                      Continuar Compra
                    </button>
                  </div>
                )}

                {/* PASSO 2: LEAD CAPTURE */}
                {checkoutStep === 'LEAD' && (
                  <div className="animate-fadeIn">
                    <button onClick={() => setCheckoutStep('CONFIG')} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold mb-4 flex items-center gap-1 transition-colors">? Voltar</button>
                    
                    <h3 className="font-serif text-xl text-white mb-2">Identifica��o</h3>
                    <p className="text-gray-400 text-sm mb-6">Para gerar seu contrato de {includesInstallation ? 'fornecimento e instala��o' : 'fornecimento'}, precisamos de alguns dados.</p>
                    
                    <div className="space-y-4">
                      {authMode === 'REGISTER' && (
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Nome Completo / Raz�o Social</label>
                          <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Digite seu nome completo" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">E-mail</label>
                        <input type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="seu@email.com" />
                      </div>

                      {authMode === 'REGISTER' && (
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">CPF ou CNPJ</label>
                          <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Somente n�meros" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Senha Segura</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="******" />
                      </div>

                      <button onClick={async () => {
                        setLoading(true);
                        if (authMode === 'REGISTER') {
                          const { data, error } = await supabase.auth.signUp({ email: customer.email, password });
                          if (data?.user) {
                            await supabase.from('profiles').update({ full_name: customer.name, cpf_cnpj: cpf }).eq('id', data.user.id);
                            setUserProfile({ id: data.user.id, full_name: customer.name, cpf_cnpj: cpf });
                            setCheckoutStep('SHIPPING');
                          }
                        } else {
                          const { data, error } = await supabase.auth.signInWithPassword({ email: customer.email, password });
                          if (data?.user) {
                            const {data: prof} = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                            setUserProfile(prof);
                            setCheckoutStep('SHIPPING');
                          }
                        }
                        setLoading(false);
                      }} disabled={loading} className="w-full bg-white text-black uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gray-200 transition-colors mt-2">
                        {loading ? 'Aguarde...' : (authMode === 'REGISTER' ? 'Criar Conta e Prosseguir' : 'Entrar e Prosseguir')}
                      </button>

                      <div className="text-center mt-4">
                        <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-xs text-[#D4AF37] hover:underline">
                          {authMode === 'LOGIN' ? 'N�o tem conta? Criar agora' : 'J� tem conta? Fazer Login'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {checkoutStep === 'SHIPPING' && (
                  <div className="space-y-6 animate-fadeIn">
                    <button onClick={() => setCheckoutStep('LEAD')} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold mb-4 flex items-center gap-1">← Voltar</button>
                    
                    <h3 className="font-serif font-bold text-xl text-white">Entrega (Frenet)</h3>
                    
                    <div className="flex gap-2">
                      <input type="text" value={cep} onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 8) v = v.slice(0, 8);
                        if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3}).*/, '$1-$2');
                        setCep(v);
                      }} placeholder="CEP (00000-000)" className="flex-1 p-3.5 border border-white/10 rounded-lg focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 shadow-sm" />
                      <button onClick={calcShipping} disabled={loading} className="bg-slate-200 px-6 rounded-lg font-bold text-slate-700 hover:bg-slate-300 transition-colors shadow-sm">
                        {loading ? '...' : 'Buscar'}
                      </button>
                    </div>

                    {shippingQuotes.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        {shippingQuotes.map((q, i) => (
                          <label key={i} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all shadow-sm ${selectedQuote === q ? 'border-black bg-[#1a1a1a]' : 'border-white/10 hover:border-white/20'}`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" className="accent-black" checked={selectedQuote === q} onChange={() => setSelectedQuote(q)} />
                              <div>
                                <span className="block text-sm font-bold">{q.carrier}</span>
                                <span className="block text-xs text-gray-400">{q.deadline} dias úteis</span>
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
                        
                        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-white/10">
                          <p className="text-sm font-medium text-white">{address.street}, {address.neighborhood}</p>
                          <p className="text-sm text-slate-600">{address.city} - {address.state}</p>
                        </div>

                        <div className="flex gap-4">
                          <div className="w-1/3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Número</label>
                            <input type="text" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} className="w-full p-3.5 border border-white/10 rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-black outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all shadow-sm" placeholder="123" />
                          </div>
                          <div className="w-2/3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Complemento (Opcional)</label>
                            <input type="text" value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} className="w-full p-3.5 border border-white/10 rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-black outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all shadow-sm" placeholder="Apto, Bloco..." />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Ponto de Referência (Opcional)</label>
                          <input type="text" value={address.reference} onChange={e => setAddress({...address, reference: e.target.value})} className="w-full p-3.5 border border-white/10 rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-black outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all shadow-sm" placeholder="Próximo a..." />
                        </div>
                      </div>
                    )}

                    {selectedQuote && (
                      <button onClick={() => {
                        if (address.street && !address.number) return alert('Por favor, informe o número da residência.');
                        setCheckoutStep('PAYMENT');
                      }} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold border-none uppercase tracking-widest font-bold text-sm py-4 rounded-lg hover:bg-gold hover:text-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300 mt-6 flex items-center justify-center gap-2">
                        Confirmar Frete e Endereço →
                      </button>
                    )}
                  </div>
                )}

                {/* PASSO 4: PAGAMENTO */}
                {checkoutStep === 'PAYMENT' && (
                  <div className="space-y-6 animate-fadeIn">
                    <button onClick={() => setCheckoutStep('SHIPPING')} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold mb-4 flex items-center gap-1">← Voltar</button>
                    
                    <h3 className="font-serif font-bold text-xl text-white">Pagamento</h3>
                    
                    {/* Resumo */}
                    <div className="bg-[#1a1a1a] p-4 rounded border border-slate-100 space-y-2 text-sm mb-6">
                      <div className="flex justify-between text-slate-600">
                        <span>Produto</span>
                         <span className="flex flex-col items-end">
                           {fmt(finalPrice)}
                           {includesInstallation && finalPrice > 0 && (
                             <span className="text-[10px] text-[#D4AF37] mt-1 uppercase tracking-wider">+ Instalação</span>
                           )}
                         </span>
                      </div>
                      <div className="flex justify-between text-slate-600 border-b border-white/10 pb-2">
                        <span>Frete</span><span>{fmt(selectedQuote.price)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-lg pt-2">
                        <span>Total</span><span className="text-gold">{fmt(finalPrice + selectedQuote.price)}</span>
                      </div>
                    </div>

                    {/* TABS DE PAGAMENTO */}
                    <div className="flex border-b border-white/10 mb-6">
                      <button onClick={() => setPaymentMethod('pix')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider ${paymentMethod === 'pix' ? 'border-b-2 border-black text-white' : 'text-gray-500'}`}>PIX (10% OFF)</button>
                      <button onClick={() => setPaymentMethod('credit_card')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider ${paymentMethod === 'credit_card' ? 'border-b-2 border-black text-white' : 'text-gray-500'}`}>Cartão de Crédito</button>
                    </div>

                    {/* DADOS FISCAIS COMUNS */}
                    <div className="mb-6">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">CPF / CNPJ (Nota Fiscal)</label>
                      <input type="text" value={customer.docNumber} onChange={e => setCustomer({...customer, docNumber: e.target.value})} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50" />
                    </div>

                    {/* FORMULÁRIO DE CARTÃO */}
                    {paymentMethod === 'credit_card' && (
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Número do Cartão</label>
                          <input type="text" value={card.number} onChange={e => setCard({...card, number: e.target.value})} placeholder="0000 0000 0000 0000" className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Nome Impresso no Cartão</label>
                          <input type="text" value={card.holderName} onChange={e => setCard({...card, holderName: e.target.value})} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Mês (MM)</label>
                            <input type="text" maxLength={2} value={card.expMonth} onChange={e => setCard({...card, expMonth: e.target.value})} placeholder="12" className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Ano (AA)</label>
                            <input type="text" maxLength={2} value={card.expYear} onChange={e => setCard({...card, expYear: e.target.value})} placeholder="29" className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50" />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">CVV</label>
                            <input type="text" maxLength={4} value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} placeholder="123" className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Parcelamento</label>
                          <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white border-white/10 focus:ring-1 focus:ring-[#D4AF37]/50 bg-[#0a0a0a]">
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
                    <div className="text-center text-xs text-gray-500 mt-3">🔒 100% Seguro via Cakto Pay</div>
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
                          <h3 className="font-serif font-bold text-2xl text-white mb-2">Pix Gerado!</h3>
                          <p className="text-gray-400 text-sm max-w-xs mx-auto">Copie o código abaixo e pague no app do seu banco. A confirmação é instantânea.</p>
                        </div>
                        <div className="bg-[#1a1a1a] p-4 rounded border border-white/10 break-all text-xs font-mono text-slate-600">
                          {pixData.pixCode}
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(pixData.pixCode)} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold border-none uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gold hover:text-white transition-all">
                          Copiar Código PIX
                        </button>
                      </>
                    ) : (
                      // TELA DE SUCESSO - CARTÃO
                      <>
                        <div>
                          <h3 className="font-serif font-bold text-2xl text-white mb-2">Pedido Aprovado!</h3>
                          <p className="text-gray-400 text-sm max-w-xs mx-auto">O pagamento via cartão de crédito foi confirmado com sucesso e seu pedido já está em andamento.</p>
                        </div>
                        <div className="bg-[#1a1a1a] p-4 rounded border border-white/10 text-sm font-bold text-slate-600">
                          ID do Pedido: {pixData.orderId}
                        </div>
                        <button onClick={closeModal} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold border-none uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gold hover:text-white transition-all">
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
