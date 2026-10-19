'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Ruler,
  Sparkles,
  X,
  ArrowRight,
  Package,
} from 'lucide-react';
import {
  Variant,
  CatalogProduct,
  StandardMeasure,
  CATALOG,
  ARREMATES,
  TAXA_INSTALACAO,
  calculateStandardItemPrice,
} from '../data/products';
import { supabase } from '@/lib/supabase';
import MotionButton from '@/components/ui/motion-button';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const WHATSAPP_SUPORTE =
  'https://wa.me/5562999257513?text=Ol%C3%A1!%20Estou%20no%20site%20da%20M%C3%A3os%20de%20Ouro%20Esquadrias%20e%20tenho%20uma%20d%C3%BAvida.';

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  image: string;
  sku: string;
  tipologia: string;
  uso: string;
  cor: string;
  medida: string;
  lado?: string;
  arremate: string;
  includesInstallation: boolean;
  quantity: number;
  unitPrice: number;
  // Metadados de cubagem para cálculo automático de frete
  width_cm: number;
  height_cm: number;
  depth_cm: number;
  weight_kg: number;
};

// Mescla produtos vindos do Supabase com as tipologias e medidas padrão definidas no código
function mergeSupabaseWithStandardCatalog(supaProducts: any[]): CatalogProduct[] {
  if (!supaProducts || supaProducts.length === 0) return CATALOG;

  // Se o banco ainda estiver com os produtos antigos por m² (ex: Pele de Vidro, Portão),
  // priorizamos os 4 Super-Produtos padronizados solicitados pela cliente, atualizando preços caso o SKU bata.
  const skuPriceMap = new Map<string, number>();
  for (const sp of supaProducts) {
    if (Array.isArray(sp.variants)) {
      for (const sv of sp.variants) {
        if (sv.sku && Number(sv.price_per_m2 || sv.price) > 0) {
          skuPriceMap.set(sv.sku, Number(sv.price || sv.price_per_m2));
        }
      }
    }
  }

  return CATALOG.map((catProd) => {
    const updatedVariants = catProd.variants.map((v) => {
      const overridePrice = skuPriceMap.get(v.sku);
      return overridePrice ? { ...v, price: overridePrice } : v;
    });
    const minPrice = Math.min(...updatedVariants.map((v) => v.price));
    return {
      ...catProd,
      from_price: minPrice,
      variants: updatedVariants,
    };
  });
}

export default function Storefront() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>(CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Estado do Carrinho (Persistido em localStorage)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fluxo do Modal de Produto / Checkout
  const [activeProduct, setActiveProduct] = useState<CatalogProduct | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'CONFIG' | 'LEAD' | 'SHIPPING' | 'PAYMENT' | 'SUCCESS' | null>(null);
  const [checkoutSource, setCheckoutSource] = useState<'CART' | 'DIRECT'>('CART');

  // Estados de Configuração do Super-Produto
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<StandardMeasure | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedLado, setSelectedLado] = useState<string>('');
  const [selectedArremate, setSelectedArremate] = useState<string>(ARREMATES[0]);
  const [includesInstallation, setIncludesInstallation] = useState<boolean>(false);
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  // Simulador Rápido de Frete na Página do Produto
  const [quickCep, setQuickCep] = useState('');
  const [quickQuotes, setQuickQuotes] = useState<any[]>([]);
  const [loadingQuickFrete, setLoadingQuickFrete] = useState(false);

  // Estados de Checkout (Cliente, Endereço, Frete e Pagamento)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', docNumber: '' });
  const [cep, setCep] = useState('');
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [address, setAddress] = useState({
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    number: '',
    complement: '',
    reference: '',
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [installments, setInstallments] = useState<number>(1);
  const [card, setCard] = useState({ number: '', holderName: '', expMonth: '', expYear: '', cvv: '' });

  // Carregar sessão do usuário e catálogo
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserProfile(data);
              setCustomer((prev) => ({
                ...prev,
                name: data.full_name || prev.name,
                email: session.user.email || prev.email,
                docNumber: data.cpf_cnpj || prev.docNumber,
              }));
            }
          });
      }
    });

    async function loadCatalog() {
      try {
        const { data } = await supabase.from('products').select('*, variants(*)').order('name');
        if (data && data.length > 0) {
          setCatalog(mergeSupabaseWithStandardCatalog(data));
        }
      } catch (e) {
        console.warn('[Storefront] Usando catálogo padrão local.');
      }
    }
    loadCatalog();
  }, []);

  // Carregar carrinho salvo no navegador
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mdo_cart_v2');
      if (saved) setCart(JSON.parse(saved));
    } catch (e) {
      console.error('Erro ao ler carrinho:', e);
    }
  }, []);

  // Sincronizar contador do carrinho com o botão no Header Global (layout.tsx)
  const totalCartItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0), [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('mdo_cart_v2', JSON.stringify(cart));
    } catch (e) {}

    const badge = document.getElementById('header-cart-badge');
    if (badge) badge.textContent = String(totalCartItems);

    const btn = document.getElementById('header-cart-btn');
    const handleHeaderClick = () => setIsCartOpen(true);
    if (btn) {
      btn.addEventListener('click', handleHeaderClick);
    }
    return () => {
      if (btn) btn.removeEventListener('click', handleHeaderClick);
    };
  }, [cart, totalCartItems]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // Categorias com destaque para Portas (Carro-Chefe)
  const categories = useMemo(() => ['Todas', 'Portas', 'Janelas', 'Espelhos'], []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todas') return catalog;
    return catalog.filter((p) => p.category === selectedCategory);
  }, [catalog, selectedCategory]);

  // Abrir Modal de Configuração de um Super-Produto
  const openProduct = (p: CatalogProduct, initialVariant?: Variant) => {
    const firstVar = initialVariant || p.variants[0];
    const firstMeasure = firstVar.medidas[0];
    setActiveProduct(p);
    setSelectedVariant(firstVar);
    setSelectedMeasure(firstMeasure);
    setSelectedColor(firstVar.cores[0] || 'Branco');
    setSelectedLado(firstVar.lados ? firstVar.lados[0] : '');
    setSelectedArremate(ARREMATES[0]);
    setIncludesInstallation(false);
    setItemQuantity(1);
    setQuickQuotes([]);
    setCheckoutStep('CONFIG');
  };

  const handleSelectVariant = (v: Variant) => {
    setSelectedVariant(v);
    setSelectedMeasure(v.medidas[0]);
    setSelectedColor(v.cores[0] || 'Branco');
    setSelectedLado(v.lados ? v.lados[0] : '');
    setQuickQuotes([]);
  };

  const closeModal = () => {
    setActiveProduct(null);
    setCheckoutStep(null);
    setPixData(null);
  };

  // Preço unitário calculado em tempo real para o item ativo
  const currentPricing = useMemo(() => {
    if (!selectedVariant) return { unitBasePrice: 0, arrematePrice: 0, installPrice: 0, unitFinalPrice: 0 };
    return calculateStandardItemPrice(
      selectedVariant.price,
      selectedMeasure?.price_delta || 0,
      selectedArremate,
      includesInstallation
    );
  }, [selectedVariant, selectedMeasure, selectedArremate, includesInstallation]);

  // Construir objeto CartItem a partir da seleção atual
  const buildCurrentCartItem = (): CartItem | null => {
    if (!activeProduct || !selectedVariant || !selectedMeasure) return null;
    return {
      id: `${selectedVariant.sku}-${selectedMeasure.label}-${selectedColor}-${selectedLado || 'UN'}-${selectedArremate}-${includesInstallation}`,
      productId: activeProduct.base_sku,
      productName: activeProduct.name,
      category: activeProduct.category,
      image: selectedVariant.image || activeProduct.image,
      sku: selectedVariant.sku,
      tipologia: selectedVariant.tipologia,
      uso: selectedVariant.uso,
      cor: selectedColor,
      medida: selectedMeasure.label,
      lado: selectedLado || undefined,
      arremate: selectedArremate,
      includesInstallation,
      quantity: itemQuantity,
      unitPrice: currentPricing.unitFinalPrice,
      width_cm: selectedMeasure.width_cm,
      height_cm: selectedMeasure.height_cm,
      depth_cm: selectedMeasure.depth_cm,
      weight_kg: selectedMeasure.weight_kg,
    };
  };

  // Ação 1: Adicionar ao Carrinho e abrir Drawer
  const handleAddToCart = () => {
    const newItem = buildCurrentCartItem();
    if (!newItem) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === newItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });

    closeModal();
    setIsCartOpen(true);
    showToast(`"${newItem.tipologia}" adicionado ao carrinho!`);
  };

  // Ação 2: Comprar Agora (Adiciona ao carrinho e vai direto para Identificação/Checkout)
  const handleBuyNow = () => {
    const newItem = buildCurrentCartItem();
    if (!newItem) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === newItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });

    setCheckoutSource('DIRECT');
    setCheckoutStep('LEAD');
  };

  // Iniciar Checkout a partir do Drawer do Carrinho
  const startCheckoutFromCart = () => {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    if (!activeProduct) {
      setActiveProduct(catalog[0]);
    }
    setCheckoutSource('CART');
    setCheckoutStep('LEAD');
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Simulador Rápido de Frete por CEP dentro do Configurador do Produto
  const simulateQuickFrete = async () => {
    const cleanCep = quickCep.replace(/\D/g, '');
    if (cleanCep.length < 8 || !selectedMeasure) return alert('Digite um CEP válido com 8 dígitos.');

    setLoadingQuickFrete(true);
    try {
      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: cleanCep,
          invoiceValue: currentPricing.unitFinalPrice * itemQuantity,
          items: [
            {
              weight_kg: selectedMeasure.weight_kg,
              length_cm: selectedMeasure.height_cm,
              width_cm: selectedMeasure.width_cm,
              depth_cm: selectedMeasure.depth_cm,
              quantity: itemQuantity,
              type: 'SHIPPABLE',
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.quotes) {
        setQuickQuotes(data.quotes);
        setCep(quickCep);
      }
    } catch (e) {
      alert('Não foi possível simular o frete no momento.');
    } finally {
      setLoadingQuickFrete(false);
    }
  };

  // Cálculo de Frete Consolidado para todos os itens do Carrinho no Checkout
  const calcCartShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length < 8) return alert('Informe um CEP válido (8 dígitos).');

    setLoading(true);
    try {
      const itemsPayload = cart.map((i) => ({
        weight_kg: i.weight_kg,
        length_cm: i.height_cm,
        width_cm: i.width_cm,
        depth_cm: i.depth_cm,
        quantity: i.quantity,
        type: 'SHIPPABLE',
      }));

      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: cleanCep,
          invoiceValue: cartSubtotal,
          items: itemsPayload,
        }),
      });
      const data = await res.json();
      if (data.quotes && data.quotes.length > 0) {
        setShippingQuotes(data.quotes);
        setSelectedQuote(data.quotes[0]);
      }

      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const viaCepData = await viaCepRes.json();
      if (!viaCepData.erro) {
        setAddress((prev) => ({
          ...prev,
          street: viaCepData.logradouro || prev.street,
          neighborhood: viaCepData.bairro || prev.neighborhood,
          city: viaCepData.localidade || prev.city,
          state: viaCepData.uf || prev.state,
        }));
      }
    } catch (e) {
      alert('Erro ao calcular frete ou buscar endereço.');
    } finally {
      setLoading(false);
    }
  };

  // Avançar da Identificação para Entrega
  const submitLeadStep = async () => {
    if (!customer.name.trim() || !customer.email.trim() || !customer.phone.trim()) {
      return alert('Preencha Nome, E-mail e WhatsApp para prosseguir.');
    }
    setLoading(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      }).catch(() => {});
      setCheckoutStep('SHIPPING');
      if (cep.replace(/\D/g, '').length === 8 && shippingQuotes.length === 0) {
        setTimeout(() => calcCartShipping(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  // Finalizar Pagamento (PIX ou Cartão)
  const submitPayment = async () => {
    if (!selectedQuote) return alert('Selecione uma opção de frete primeiro.');
    if (!customer.docNumber.trim()) return alert('Informe seu CPF ou CNPJ para emissão da Nota Fiscal.');

    if (paymentMethod === 'credit_card') {
      if (!card.number || !card.holderName || !card.expMonth || !card.expYear || !card.cvv) {
        return alert('Preencha todos os dados do cartão de crédito.');
      }
    }

    setLoading(true);
    try {
      const rawTotal = cartSubtotal + Number(selectedQuote.price || 0);
      const finalTotal = paymentMethod === 'pix' ? Math.round(rawTotal * 0.9 * 100) / 100 : rawTotal;
      const anyInstall = cart.some((i) => i.includesInstallation);

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id || null,
          ...customer,
          cep,
          address,
          subtotal: cartSubtotal,
          total: finalTotal,
          shipping: selectedQuote,
          includesInstallation: anyInstall,
          items: cart.map((item) => ({
            product: item.productName,
            name: `${item.tipologia} (${item.medida} - ${item.cor})`,
            sku: item.sku,
            tipologia: item.tipologia,
            medida: item.medida,
            cor: item.cor,
            lado: item.lado,
            arremate: item.arremate,
            width: item.width_cm,
            height: item.height_cm,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            price: item.unitPrice * item.quantity,
          })),
          paymentMethod,
          installments,
          card: paymentMethod === 'credit_card' ? card : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Não foi possível processar o pagamento.');
        setLoading(false);
        return;
      }

      setPixData({ ...data, finalTotal });
      setCheckoutStep('SUCCESS');
      setCart([]); // Limpa carrinho após gerar o pedido

      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Purchase', { value: finalTotal, currency: 'BRL' });
        }
        if ((window as any).dataLayer) {
          (window as any).dataLayer.push({
            event: 'purchase',
            ecommerce: {
              transaction_id: data.orderId || new Date().getTime().toString(),
              value: finalTotal,
              currency: 'BRL',
            },
          });
        }
      }
    } catch (e) {
      alert('Erro de conexão ao finalizar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const portasSuperProduct = useMemo(
    () => catalog.find((p) => p.category === 'Portas') || CATALOG[0],
    [catalog]
  );

  return (
    <div className="bg-[#0a0a0a] min-h-screen font-roboto text-white pb-24">
      {/* TOAST DE FEEDBACK DO CARRINHO */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#141414] border border-[#D4AF37] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="text-[#D4AF37] size-5 shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION — FOCO NO CARRO-CHEFE (PORTAS DE ALUMÍNIO PRONTA ENTREGA / TAMANHO PADRÃO) */}
      <div className="relative w-full py-20 md:py-28 bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-b border-[#D4AF37]/15">
        <div className="absolute inset-0 bg-[url('/images/porta%20imponente.jpg')] bg-cover bg-center opacity-15 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 text-center flex flex-col items-center px-4 max-w-4xl mx-auto"
        >
          <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.25em] px-4 py-1.5 rounded-full mb-6">
            Fabricação Própria • Medidas Padrão • Compra Direta
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl text-white font-light tracking-tight mb-5">
            Mãos de Ouro <span className="text-[#D4AF37] font-semibold italic">Esquadrias</span>
          </h1>
          <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-8">
            Portas de Alumínio completas, Janelas de Correr, Pivotantes, Camarão e Espelhos com LED Touch Screen.
            Escolha a tipologia, calcule o frete na hora e compre direto pelo site com PIX (10% OFF) ou Cartão.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#vitrine-portas"
              className="bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold uppercase tracking-widest text-xs sm:text-sm px-8 py-4 rounded-full hover:brightness-110 transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2"
            >
              Ver Portas de Alumínio <ArrowRight className="size-4" />
            </a>
            <a
              href="#catalogo"
              className="border border-white/20 hover:border-[#D4AF37] text-white hover:text-[#D4AF37] font-semibold uppercase tracking-widest text-xs sm:text-sm px-7 py-4 rounded-full transition-all"
            >
              Catálogo Completo (4 Linhas)
            </a>
          </div>
        </motion.div>
      </div>

      {/* DESTAQUE CARRO-CHEFE: PORTAS DE ALUMÍNIO POR AMBIENTE (PEDIDO 1 + ÁUDIO) */}
      <section id="vitrine-portas" className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[#D4AF37] uppercase tracking-[0.25em] text-xs font-bold">Produto Carro-Chefe</span>
            <h2 className="font-serif text-3xl md:text-4xl text-white mt-2">
              Portas de Alumínio por Ambiente
            </h2>
            <p className="text-gray-400 text-sm mt-2 max-w-2xl">
              Todas as tipologias em tamanho padrão prontas para instalar. Selecione o modelo ideal para sua cozinha, quarto ou entrada social:
            </p>
          </div>
          <button
            onClick={() => openProduct(portasSuperProduct)}
            className="self-start md:self-auto text-xs font-bold uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-black px-5 py-3 rounded-full transition-all"
          >
            Abrir Configurador Geral de Portas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {portasSuperProduct.variants.map((v) => (
            <div
              key={v.sku}
              className="bg-[#111] border border-white/10 hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group shadow-lg"
            >
              <div>
                <div
                  onClick={() => openProduct(portasSuperProduct, v)}
                  className="relative w-full aspect-[4/4] bg-[#181818] overflow-hidden cursor-pointer"
                >
                  <Image
                    src={v.image || portasSuperProduct.image}
                    alt={v.tipologia}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-black/85 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {v.uso}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#D4AF37] transition-colors leading-snug">
                    {v.tipologia}
                  </h3>
                  <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">{v.descricao}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-gray-300 border-t border-white/10 pt-3">
                    <div>
                      <span className="text-gray-500">Cores:</span> {v.cores.join(', ')}
                    </div>
                    <div>
                      <span className="text-gray-500">Medidas Padrão:</span>{' '}
                      {v.medidas.map((m) => m.label.replace(' cm', '')).join(' | ')}
                    </div>
                    {v.lados && (
                      <div>
                        <span className="text-gray-500">Abertura:</span> Direita ou Esquerda
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 mt-auto">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs text-gray-400">A partir de</span>
                  <span className="font-serif text-2xl font-bold text-[#D4AF37]">{fmt(v.price)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openProduct(portasSuperProduct, v)}
                    className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider py-3 px-2 rounded-lg transition-colors"
                  >
                    <ShoppingCart className="size-3.5 text-[#D4AF37]" /> + Carrinho
                  </button>
                  <button
                    onClick={() => openProduct(portasSuperProduct, v)}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#B5952F] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider py-3 px-2 rounded-lg transition-all"
                  >
                    Comprar Agora
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATÁLOGO PRINCIPAL — OS 4 SUPER-PRODUTOS (PORTAS, JANELAS DE CORRER, JANELAS PIVOTANTES/CAMARÃO, ESPELHOS LED) */}
      <section className="max-w-7xl mx-auto px-6 pt-12" id="catalogo">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4 border-t border-white/10 pt-12">
          <div>
            <span className="text-[#D4AF37] uppercase tracking-[0.25em] text-xs font-bold">Catálogo Oficial Simplificado</span>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white mt-1">
              {selectedCategory === 'Todas' ? '4 Linhas Principais com Variações Padrão' : selectedCategory}
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              Selecione o produto base para escolher a tipologia, cor, tamanho padrão e calcular o frete automático por CEP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                  selectedCategory === c
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-[#111] text-gray-300 border-white/10 hover:border-[#D4AF37]/50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredProducts.map((p) => (
            <div
              key={p.base_sku}
              className="bg-[#111] border border-white/10 hover:border-[#D4AF37]/50 rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all group shadow-xl"
            >
              <div
                className="relative w-full sm:w-2/5 aspect-[4/4] sm:aspect-auto bg-[#181818] cursor-pointer overflow-hidden shrink-0"
                onClick={() => openProduct(p)}
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 300px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest">
                    {p.category}
                  </span>
                  <span className="bg-black/80 text-white border border-white/15 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    {p.variants.length} Tipologias
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() => openProduct(p)}
                    className="font-serif font-bold text-xl text-white group-hover:text-[#D4AF37] transition-colors cursor-pointer"
                  >
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#D4AF37] font-medium mt-1">{p.subtitle}</p>
                  <p className="text-gray-400 text-xs mt-3 leading-relaxed line-clamp-3">{p.description}</p>

                  {/* Chips das tipologias inclusas dentro deste Super-Produto */}
                  <div className="mt-4">
                    <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                      Modelos disponíveis neste item:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.variants.map((v) => (
                        <button
                          key={v.sku}
                          onClick={() => openProduct(p, v)}
                          className="text-[11px] bg-black/60 hover:bg-[#D4AF37]/20 text-gray-200 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/40 px-2.5 py-1 rounded-md transition-colors text-left"
                        >
                          {v.tipologia}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <span className="text-xs text-gray-400 block">Tamanho Padrão a partir de</span>
                      <span className="font-serif text-2xl font-bold text-[#D4AF37]">{fmt(p.from_price)}</span>
                      <span className="text-[11px] text-gray-400 ml-1">/ unid.</span>
                    </div>
                    <span className="text-[11px] text-[#00B25A] font-semibold flex items-center gap-1">
                      <Truck className="size-3.5" /> Frete por CEP
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openProduct(p)}
                      className="flex items-center justify-center gap-2 border border-[#D4AF37]/50 hover:bg-[#D4AF37]/15 text-[#D4AF37] font-bold text-xs uppercase tracking-wider py-3 px-3 rounded-xl transition-all"
                    >
                      <ShoppingCart className="size-4" /> Adicionar ao Carrinho
                    </button>
                    <button
                      onClick={() => openProduct(p)}
                      className="bg-gradient-to-r from-[#D4AF37] to-[#B5952F] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider py-3 px-3 rounded-xl transition-all shadow-md"
                    >
                      Comprar Agora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIFERENCIAIS LOGÍSTICOS E DE QUALIDADE */}
      <section className="max-w-7xl mx-auto px-6 pt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex items-start gap-4">
            <Ruler className="text-[#D4AF37] size-8 shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-lg text-white font-semibold">Medidas Padronizadas</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Esquadrias prontas para instalar nos vãos padrão de mercado (210x70, 210x80, 210x90, 210x100cm e janelas modulares), reduzindo custo de frete e prazo.
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex items-start gap-4">
            <Truck className="text-[#D4AF37] size-8 shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-lg text-white font-semibold">Cálculo de Frete por Cubagem</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Cotação automática por CEP considerando peso bruto e dimensões reais de cada esquadria, além de Frota Própria para Goiânia e Região.
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex items-start gap-4">
            <ShieldCheck className="text-[#D4AF37] size-8 shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-lg text-white font-semibold">Checkout Transparente PIX &amp; Cartão</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Aprovação instantânea via PIX com 10% de desconto ou parcelamento em até 12x no cartão de crédito com emissão imediata de Ordem de Serviço.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DRAWER LATERAL DO CARRINHO DE COMPRAS (🛒) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              className="bg-[#0d0d0d] border-l border-[#D4AF37]/25 w-full max-w-md h-full flex flex-col justify-between shadow-2xl"
            >
              {/* Header do Drawer */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-[#D4AF37] size-5" />
                  <h3 className="font-serif text-xl font-bold text-white">Seu Carrinho</h3>
                  <span className="bg-[#D4AF37] text-black text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {totalCartItems} {totalCartItems === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Lista de Itens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <Package className="size-12 text-gray-600 mx-auto" />
                    <p className="text-gray-400 text-sm">Seu carrinho está vazio.</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 px-5 py-2.5 rounded-full hover:bg-[#D4AF37] hover:text-black transition-all"
                    >
                      Explorar Portas e Janelas
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#141414] border border-white/10 rounded-xl p-4 flex gap-3.5 relative"
                    >
                      <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-black shrink-0">
                        <Image src={item.image} alt={item.tipologia} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white leading-snug pr-6">{item.tipologia}</h4>
                        <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                          <p>
                            Medida: <strong className="text-gray-200">{item.medida}</strong> • Cor:{' '}
                            <strong className="text-gray-200">{item.cor}</strong>
                          </p>
                          {item.lado && <p>Lado: {item.lado}</p>}
                          {item.arremate !== 'Sem arremate' && <p>{item.arremate}</p>}
                          {item.includesInstallation && (
                            <p className="text-[#D4AF37] font-semibold">+ Instalação Técnica Inclusa</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg px-2 py-1">
                            <button
                              onClick={() => updateCartQty(item.id, -1)}
                              className="text-gray-400 hover:text-white p-0.5"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.id, 1)}
                              className="text-gray-400 hover:text-white p-0.5"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <span className="font-serif font-bold text-base text-[#D4AF37]">
                            {fmt(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCartItem(item.id)}
                        title="Remover item"
                        className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer do Drawer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-white/10 bg-[#111] space-y-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal ({totalCartItems} vol.)</span>
                      <span className="text-white font-bold">{fmt(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#00B25A]">
                      <span>No PIX com 10% de desconto</span>
                      <span className="font-bold">{fmt(cartSubtotal * 0.9)}</span>
                    </div>
                  </div>

                  <button
                    onClick={startCheckoutFromCart}
                    className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] hover:brightness-110 text-black font-extrabold uppercase tracking-widest text-xs sm:text-sm py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    Calcular Frete e Finalizar Compra <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIGURAÇÃO DE PRODUTO E CHECKOUT TRANSPARENTE */}
      {activeProduct && checkoutStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0d0d0d] border border-white/15 w-full max-w-5xl md:rounded-2xl shadow-2xl h-full md:h-[88vh] flex flex-col md:flex-row overflow-hidden relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/80 hover:bg-[#D4AF37] text-white hover:text-black rounded-full flex items-center justify-center transition-colors border border-white/15"
            >
              ✕
            </button>

            {/* Coluna Esquerda: Preview Visual + Metadados de Cubagem */}
            <div className="hidden md:flex md:w-5/12 relative bg-[#141414] flex-col justify-between border-r border-white/10">
              <div className="relative flex-1 w-full">
                <Image
                  src={(checkoutStep === 'CONFIG' && selectedVariant?.image) || activeProduct.image}
                  alt={activeProduct.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-black/40" />
                <div className="absolute top-4 left-4 bg-black/80 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {activeProduct.category} • Tamanho Padrão
                </div>
              </div>

              {checkoutStep === 'CONFIG' && selectedVariant && selectedMeasure && (
                <div className="p-6 bg-[#0d0d0d] border-t border-white/10 space-y-2">
                  <span className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-bold flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> Especificação Selecionada
                  </span>
                  <h4 className="font-serif text-lg font-bold text-white leading-snug">{selectedVariant.tipologia}</h4>
                  <p className="text-xs text-gray-400">Uso indicado: {selectedVariant.uso}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-gray-300 border-t border-white/10">
                    <div>
                      <span className="text-gray-500">Dimensões:</span> {selectedMeasure.height_cm}x
                      {selectedMeasure.width_cm}x{selectedMeasure.depth_cm} cm
                    </div>
                    <div>
                      <span className="text-gray-500">Peso Bruto:</span> {selectedMeasure.weight_kg} kg
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita: Passo a Passo */}
            <div className="w-full md:w-7/12 flex flex-col h-full overflow-y-auto bg-[#0d0d0d]">
              <div className="p-6 md:px-8 md:py-6 border-b border-white/10">
                <div className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest mb-1">
                  {checkoutStep === 'CONFIG' ? `${activeProduct.category} — Escolha as Opções` : 'Finalização Direta do Pedido'}
                </div>
                <h2 className="font-serif text-xl md:text-2xl font-bold text-white leading-tight">
                  {checkoutStep === 'CONFIG' ? activeProduct.name : `Checkout Seguro (${totalCartItems} vol.)`}
                </h2>
              </div>

              <div className="p-6 md:p-8 flex-1">
                {/* PASSO 1: CONFIGURADOR DE TIPOLOGIA E MEDIDAS PADRÃO */}
                {checkoutStep === 'CONFIG' && selectedVariant && selectedMeasure && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* 1. Seleção da Tipologia */}
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] mb-2.5">
                        1. Escolha o Modelo / Tipologia
                      </h4>
                      <div className="space-y-2.5">
                        {activeProduct.variants.map((v) => {
                          const isSelected = selectedVariant.sku === v.sku;
                          return (
                            <div
                              key={v.sku}
                              onClick={() => handleSelectVariant(v)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                                  : 'border-white/10 bg-[#141414] hover:border-white/25'
                              }`}
                            >
                              <div>
                                <div className="text-sm font-bold text-white">{v.tipologia}</div>
                                <div className="text-xs text-gray-400 mt-0.5">Ambiente: {v.uso}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-[#D4AF37]">{fmt(v.price)}</span>
                                <span className="block text-[10px] text-gray-400">base</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Seleção da Medida Padrão */}
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] mb-2.5">
                        2. Medida Padrão (Pronta p/ Vão)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedVariant.medidas.map((m) => {
                          const active = selectedMeasure.label === m.label;
                          return (
                            <button
                              key={m.label}
                              type="button"
                              onClick={() => setSelectedMeasure(m)}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                                active
                                  ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold'
                                  : 'bg-[#141414] text-gray-200 border-white/10 hover:border-[#D4AF37]/50'
                              }`}
                            >
                              <div>
                                <span className="text-sm block">{m.label}</span>
                                <span className={`text-[10px] ${active ? 'text-black/80' : 'text-gray-400'}`}>
                                  Peso: {m.weight_kg}kg
                                </span>
                              </div>
                              <span className="text-xs font-bold">
                                {m.price_delta && m.price_delta > 0 ? `+ ${fmt(m.price_delta)}` : 'Padrão'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Cor / Tonalidade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] mb-2">
                          3. Cor / Acabamento
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedVariant.cores.map((cor) => (
                            <button
                              key={cor}
                              type="button"
                              onClick={() => setSelectedColor(cor)}
                              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                                selectedColor === cor
                                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                                  : 'bg-[#141414] text-gray-300 border-white/10 hover:border-[#D4AF37]/50'
                              }`}
                            >
                              {cor}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Lado de Abertura (apenas para Portas que possuem lado) */}
                      {selectedVariant.lados && selectedVariant.lados.length > 0 && (
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] mb-2">
                            4. Lado de Abertura
                          </h4>
                          <select
                            value={selectedLado}
                            onChange={(e) => setSelectedLado(e.target.value)}
                            className="w-full p-2.5 border border-white/15 rounded-lg bg-[#141414] text-white text-xs outline-none focus:border-[#D4AF37]"
                          >
                            {selectedVariant.lados.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 5. Arremate / Guarnição e Quantidade */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] mb-2">
                          Kit Guarnição / Acabamento
                        </h4>
                        <select
                          value={selectedArremate}
                          onChange={(e) => setSelectedArremate(e.target.value)}
                          className="w-full p-2.5 border border-white/15 rounded-lg bg-[#141414] text-white text-xs outline-none focus:border-[#D4AF37]"
                        >
                          {ARREMATES.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] mb-2">Quantidade</h4>
                        <div className="flex items-center justify-between border border-white/15 rounded-lg bg-[#141414] px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                            className="text-gray-400 hover:text-white"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="font-bold text-sm">{itemQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setItemQuantity((q) => q + 1)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Simulador Rápido de Frete na Página do Produto */}
                    <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-1.5">
                        <Truck className="size-4 text-[#D4AF37]" /> Simular Frete e Prazo por CEP
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickCep}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                            if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
                            setQuickCep(v);
                          }}
                          placeholder="Digite seu CEP (00000-000)"
                          className="flex-1 px-3.5 py-2.5 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                        />
                        <button
                          type="button"
                          onClick={simulateQuickFrete}
                          disabled={loadingQuickFrete}
                          className="bg-white/10 hover:bg-[#D4AF37] text-white hover:text-black font-bold text-xs uppercase tracking-wider px-4 rounded-lg transition-colors"
                        >
                          {loadingQuickFrete ? '...' : 'Calcular'}
                        </button>
                      </div>
                      {quickQuotes.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                          {quickQuotes.map((q, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-300">
                              <span>
                                {q.carrier} ({q.deadline} dias úteis)
                              </span>
                              <strong className="text-[#D4AF37]">{q.price === 0 ? 'Grátis' : fmt(q.price)}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resumo de Valor + Botões de Ação Direta */}
                    <div className="bg-gradient-to-r from-[#1a160c] to-[#121212] p-5 rounded-xl border border-[#D4AF37]/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-400 text-xs block">Valor Total ({itemQuantity} un.)</span>
                          <span className="text-xs text-[#00B25A] font-semibold">
                            No PIX: {fmt(currentPricing.unitFinalPrice * itemQuantity * 0.9)} (10% OFF)
                          </span>
                        </div>
                        <span className="font-serif font-bold text-3xl text-[#D4AF37]">
                          {fmt(currentPricing.unitFinalPrice * itemQuantity)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="w-full py-4 px-4 rounded-xl border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/15 font-extrabold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <ShoppingCart className="size-4" /> Adicionar ao Carrinho
                      </button>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B5952F] hover:brightness-110 text-black font-extrabold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#D4AF37]/20"
                      >
                        Comprar Agora <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 2: IDENTIFICAÇÃO RÁPIDA (SEM ATRITO) */}
                {checkoutStep === 'LEAD' && (
                  <div className="space-y-5 animate-fadeIn">
                    <button
                      onClick={() => {
                        if (checkoutSource === 'DIRECT') setCheckoutStep('CONFIG');
                        else {
                          closeModal();
                          setIsCartOpen(true);
                        }
                      }}
                      className="text-xs text-gray-400 hover:text-white uppercase tracking-widest font-bold flex items-center gap-1"
                    >
                      ← Voltar
                    </button>

                    <div>
                      <h3 className="font-serif text-xl text-white">1. Dados para Nota Fiscal e Rastreio</h3>
                      <p className="text-gray-400 text-xs mt-1">
                        Informe seus dados para receber o comprovante do pedido e acompanhamento da entrega.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                          Nome Completo ou Razão Social *
                        </label>
                        <input
                          type="text"
                          value={customer.name}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          className="w-full bg-[#141414] border border-white/15 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]"
                          placeholder="Ex: João da Silva"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">E-mail *</label>
                          <input
                            type="email"
                            value={customer.email}
                            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                            className="w-full bg-[#141414] border border-white/15 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]"
                            placeholder="seu@email.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                            WhatsApp com DDD *
                          </label>
                          <input
                            type="tel"
                            value={customer.phone}
                            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                            className="w-full bg-[#141414] border border-white/15 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]"
                            placeholder="(62) 99999-9999"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                          CPF ou CNPJ (para Nota Fiscal) *
                        </label>
                        <input
                          type="text"
                          value={customer.docNumber}
                          onChange={(e) => setCustomer({ ...customer, docNumber: e.target.value })}
                          className="w-full bg-[#141414] border border-white/15 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]"
                          placeholder="Somente números"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={submitLeadStep}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black uppercase tracking-widest font-extrabold text-sm py-4 rounded-xl hover:brightness-110 transition-all mt-2"
                      >
                        {loading ? 'Validando...' : 'Continuar para Frete e Entrega →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 3: CÁLCULO DE FRETE E ENDEREÇO DE ENTREGA */}
                {checkoutStep === 'SHIPPING' && (
                  <div className="space-y-6 animate-fadeIn">
                    <button
                      onClick={() => setCheckoutStep('LEAD')}
                      className="text-xs text-gray-400 hover:text-white uppercase tracking-widest font-bold flex items-center gap-1"
                    >
                      ← Voltar para Dados
                    </button>

                    <div>
                      <h3 className="font-serif font-bold text-xl text-white">2. Cálculo de Frete &amp; Endereço</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Cálculo automático baseado no peso e medidas dos {totalCartItems} volume(s) do seu pedido.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                          if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
                          setCep(v);
                        }}
                        placeholder="CEP (00000-000)"
                        className="flex-1 p-3.5 border border-white/15 rounded-lg focus:border-[#D4AF37] outline-none bg-[#141414] text-white"
                      />
                      <button
                        onClick={calcCartShipping}
                        disabled={loading}
                        className="bg-[#D4AF37] px-6 rounded-lg font-bold text-black hover:brightness-110 transition-colors"
                      >
                        {loading ? 'Calculando...' : 'Calcular Frete'}
                      </button>
                    </div>

                    {shippingQuotes.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <span className="text-xs uppercase tracking-wider text-gray-400 font-bold block">
                          Selecione a Modalidade de Envio:
                        </span>
                        {shippingQuotes.map((q, i) => (
                          <label
                            key={i}
                            onClick={() => setSelectedQuote(q)}
                            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                              selectedQuote === q
                                ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                                : 'border-white/10 bg-[#141414] hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                className="accent-[#D4AF37]"
                                checked={selectedQuote === q}
                                onChange={() => setSelectedQuote(q)}
                              />
                              <div>
                                <span className="block text-sm font-bold text-white">{q.carrier}</span>
                                <span className="block text-xs text-gray-400">
                                  Prazo estimado: até {q.deadline} dias úteis {q.message ? `• ${q.message}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-[#D4AF37] shrink-0">
                              {q.price === 0 ? 'Grátis' : fmt(q.price)}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {selectedQuote && (
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37]">
                          Endereço de Entrega
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-gray-400 mb-1">Rua / Logradouro *</label>
                            <input
                              type="text"
                              value={address.street}
                              onChange={(e) => setAddress({ ...address, street: e.target.value })}
                              className="w-full p-3 rounded-lg bg-[#141414] border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Número *</label>
                            <input
                              type="text"
                              value={address.number}
                              onChange={(e) => setAddress({ ...address, number: e.target.value })}
                              placeholder="Ex: 120"
                              className="w-full p-3 rounded-lg bg-[#141414] border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Bairro *</label>
                            <input
                              type="text"
                              value={address.neighborhood}
                              onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                              className="w-full p-3 rounded-lg bg-[#141414] border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Cidade *</label>
                            <input
                              type="text"
                              value={address.city}
                              onChange={(e) => setAddress({ ...address, city: e.target.value })}
                              className="w-full p-3 rounded-lg bg-[#141414] border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">UF *</label>
                            <input
                              type="text"
                              maxLength={2}
                              value={address.state}
                              onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                              className="w-full p-3 rounded-lg bg-[#141414] border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">
                            Complemento / Referência (Opcional)
                          </label>
                          <input
                            type="text"
                            value={address.complement}
                            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                            placeholder="Quadra, Lote, Condomínio..."
                            className="w-full p-3 rounded-lg bg-[#141414] border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!address.street || !address.number || !address.city) {
                              return alert('Preencha Rua, Número e Cidade para entrega.');
                            }
                            setCheckoutStep('PAYMENT');
                          }}
                          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-extrabold uppercase tracking-widest text-sm py-4 rounded-xl hover:brightness-110 transition-all mt-4"
                        >
                          Ir para Pagamento Transparente →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* PASSO 4: PAGAMENTO TRANSPARENTE (PIX INSTANTÂNEO OU CARTÃO) */}
                {checkoutStep === 'PAYMENT' && selectedQuote && (
                  <div className="space-y-6 animate-fadeIn">
                    <button
                      onClick={() => setCheckoutStep('SHIPPING')}
                      className="text-xs text-gray-400 hover:text-white uppercase tracking-widest font-bold flex items-center gap-1"
                    >
                      ← Voltar para Frete
                    </button>

                    <h3 className="font-serif font-bold text-xl text-white">3. Pagamento Transparente</h3>

                    {/* Resumo do Pedido */}
                    <div className="bg-[#141414] p-4 rounded-xl border border-white/10 space-y-2 text-sm">
                      <div className="max-h-32 overflow-y-auto space-y-1.5 border-b border-white/10 pb-2 mb-2">
                        {cart.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-gray-300">
                            <span>
                              {item.quantity}x {item.tipologia} ({item.medida} - {item.cor})
                            </span>
                            <span className="font-bold">{fmt(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-gray-300 text-xs">
                        <span>Subtotal Produtos</span>
                        <span>{fmt(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-300 text-xs border-b border-white/10 pb-2">
                        <span>Frete ({selectedQuote.carrier})</span>
                        <span>{fmt(selectedQuote.price)}</span>
                      </div>
                      {paymentMethod === 'pix' && (
                        <div className="flex justify-between text-[#00B25A] text-xs font-bold">
                          <span>Desconto PIX Instantâneo (10% OFF)</span>
                          <span>- {fmt((cartSubtotal + selectedQuote.price) * 0.1)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white font-bold text-lg pt-1">
                        <span>Total a Pagar</span>
                        <span className="text-[#D4AF37]">
                          {fmt(
                            paymentMethod === 'pix'
                              ? (cartSubtotal + selectedQuote.price) * 0.9
                              : cartSubtotal + selectedQuote.price
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Abas PIX / Cartão */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all ${
                          paymentMethod === 'pix'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-gray-400 border-white/10'
                        }`}
                      >
                        PIX (10% OFF Instantâneo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('credit_card')}
                        className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all ${
                          paymentMethod === 'credit_card'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-gray-400 border-white/10'
                        }`}
                      >
                        Cartão até 12x
                      </button>
                    </div>

                    {paymentMethod === 'credit_card' && (
                      <div className="space-y-3 bg-[#141414] p-4 rounded-xl border border-white/10">
                        <div>
                          <label className="block text-[11px] uppercase text-gray-400 mb-1">Número do Cartão</label>
                          <input
                            type="text"
                            value={card.number}
                            onChange={(e) => setCard({ ...card, number: e.target.value })}
                            placeholder="0000 0000 0000 0000"
                            className="w-full p-3 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-gray-400 mb-1">
                            Nome Impresso no Cartão
                          </label>
                          <input
                            type="text"
                            value={card.holderName}
                            onChange={(e) => setCard({ ...card, holderName: e.target.value })}
                            className="w-full p-3 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] uppercase text-gray-400 mb-1">Mês (MM)</label>
                            <input
                              type="text"
                              maxLength={2}
                              value={card.expMonth}
                              onChange={(e) => setCard({ ...card, expMonth: e.target.value })}
                              placeholder="12"
                              className="w-full p-3 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] uppercase text-gray-400 mb-1">Ano (AA)</label>
                            <input
                              type="text"
                              maxLength={2}
                              value={card.expYear}
                              onChange={(e) => setCard({ ...card, expYear: e.target.value })}
                              placeholder="29"
                              className="w-full p-3 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] uppercase text-gray-400 mb-1">CVV</label>
                            <input
                              type="text"
                              maxLength={4}
                              value={card.cvv}
                              onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                              placeholder="123"
                              className="w-full p-3 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-gray-400 mb-1">Parcelamento</label>
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="w-full p-3 rounded-lg bg-black border border-white/15 text-sm text-white outline-none focus:border-[#D4AF37]"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                              <option key={num} value={num}>
                                {num}x de {fmt((cartSubtotal + selectedQuote.price) / num)} sem juros
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <MotionButton
                      label={
                        loading
                          ? 'Processando Pedido...'
                          : paymentMethod === 'pix'
                          ? 'Gerar Código PIX Agora'
                          : 'Finalizar Pagamento no Cartão'
                      }
                      onClick={submitPayment}
                      disabled={loading}
                      classes="w-full max-w-full rounded-xl"
                    />
                    <div className="text-center text-xs text-gray-500">
                      🔒 Ambiente Criptografado • Ordem de Serviço enviada automaticamente por E-mail/WhatsApp
                    </div>
                  </div>
                )}

                {/* PASSO 5: CONFIRMAÇÃO DO PEDIDO + PIX COPIA E COLA */}
                {checkoutStep === 'SUCCESS' && pixData && (
                  <div className="text-center py-6 space-y-5 animate-fadeIn">
                    <div className="w-16 h-16 bg-[#00B25A]/20 text-[#00B25A] rounded-full flex items-center justify-center mx-auto text-3xl border border-[#00B25A]/40">
                      ✓
                    </div>

                    {pixData.pixCode ? (
                      <>
                        <div>
                          <h3 className="font-serif font-bold text-2xl text-white">Pedido Registrado — PIX Gerado!</h3>
                          <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                            Pedido <strong>#{String(pixData.orderId).substring(0, 8).toUpperCase()}</strong> no valor de{' '}
                            <strong className="text-[#D4AF37]">{fmt(pixData.finalTotal)}</strong>. Copie o código PIX
                            abaixo para pagar no aplicativo do seu banco:
                          </p>
                        </div>
                        <div className="bg-[#141414] p-4 rounded-xl border border-white/15 break-all text-xs font-mono text-gray-300 select-all">
                          {pixData.pixCode}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixData.pixCode);
                            showToast('Código PIX copiado para a área de transferência!');
                          }}
                          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-extrabold uppercase tracking-widest text-xs sm:text-sm py-4 rounded-xl hover:brightness-110 transition-all"
                        >
                          Copiar Código PIX (Copia e Cola)
                        </button>
                      </>
                    ) : (
                      <div>
                        <h3 className="font-serif font-bold text-2xl text-white mb-2">Pagamento Confirmado!</h3>
                        <p className="text-gray-400 text-sm">
                          Pedido <strong>#{String(pixData.orderId).substring(0, 8).toUpperCase()}</strong> aprovado e
                          Ordem de Produção encaminhada para nossa fábrica.
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <a
                        href="/cliente"
                        className="flex-1 border border-white/20 hover:border-[#D4AF37] text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-colors"
                      >
                        Acompanhar em Meus Pedidos
                      </a>
                      <a
                        href={WHATSAPP_SUPORTE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#00B25A] hover:bg-[#00924A] text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-colors"
                      >
                        Enviar Comprovante no WhatsApp
                      </a>
                    </div>
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
