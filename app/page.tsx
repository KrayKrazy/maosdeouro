'use client';
import { useState } from 'react';
import { CATALOG, quoteM2, Variant } from '../data/products';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Catalogo() {
  const [largura, setLargura] = useState(2);
  const [altura, setAltura] = useState(2.5);

  // Estados de Checkout
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [cep, setCep] = useState('');
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Estados do Cliente (Para PIX)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', docNumber: '' });
  const [pixData, setPixData] = useState<any>(null);
  const [loadingPix, setLoadingPix] = useState(false);

  const finalPrice = selectedVariant ? quoteM2(selectedVariant.price_per_m2, largura, altura) : 0;

  const handleBuy = (productName: string, variant: Variant) => {
    setSelectedProductName(productName);
    setSelectedVariant(variant);
    setPixData(null);
    setShippingQuotes([]);

    // Rastreamento: Início do Checkout / Add to Cart
    if (typeof window !== 'undefined') {
      const price = quoteM2(variant.price_per_m2, largura, altura);
      // Meta Pixel
      if ((window as any).fbq) {
        (window as any).fbq('track', 'InitiateCheckout', {
          content_name: productName,
          content_ids: [variant.sku],
          value: price,
          currency: 'BRL',
        });
      }
      // Google Tag Manager / Analytics
      if ((window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'begin_checkout',
          ecommerce: {
            currency: 'BRL',
            value: price,
            items: [{ item_id: variant.sku, item_name: productName, price: price, quantity: 1 }]
          }
        });
      }
    }
  };

  const calcShipping = async () => {
    setLoadingShipping(true);
    try {
      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep,
          peso: 50, // mock peso de esquadria grande
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
    setLoadingShipping(false);
  };

  const generatePix = async () => {
    if (!selectedQuote) return alert('Selecione um frete primeiro');
    setLoadingPix(true);
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

      // Rastreamento: Compra (Geração do PIX)
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Purchase', { value: totalCost, currency: 'BRL' });
        }
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
    setLoadingPix(false);
  };

  return (
    <section className="py-12 px-6 max-w-5xl mx-auto relative">
      <h1 className="font-montserrat text-3xl font-bold text-black mb-4">Catálogo — Preço por m² e sob medida</h1>
      <p className="text-slate-600 mb-8 text-lg">
        Fabricação própria em Goiânia. Informe as medidas abaixo para estimar o valor final.
      </p>

      <div className="flex gap-4 mb-10 p-6 bg-white shadow-sm border border-slate-200 rounded-xl">
        <label className="flex flex-col font-medium text-slate-700 w-1/2">
          Largura (m)
          <input type="number" step="0.1" min="0.5" value={largura}
            className="mt-1 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold/50"
            onChange={(e) => setLargura(Number(e.target.value))} />
        </label>
        <label className="flex flex-col font-medium text-slate-700 w-1/2">
          Altura (m)
          <input type="number" step="0.1" min="0.5" value={altura}
            className="mt-1 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold/50"
            onChange={(e) => setAltura(Number(e.target.value))} />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {CATALOG.map((p) => (
          <article key={p.base_sku} className="border border-slate-200 rounded-xl p-6 bg-white hover:shadow-lg transition-shadow">
            <h2 className="font-montserrat font-bold text-xl mb-1">{p.name}</h2>
            <p className="text-slate-500 mb-4 text-sm font-medium">A partir de {fmt(p.from_price_per_m2)}/m²</p>
            <ul className="space-y-3">
              {p.variants.map((v) => (
                <li key={v.sku} className="text-sm p-4 bg-slate-50 rounded-lg flex flex-col justify-between items-start gap-2">
                  <div className="text-slate-700">
                    {[v.aluminio, v.vidro, v.linha, v.modelo].filter(Boolean).join(' • ')} —{' '}
                    <strong className="text-black">{fmt(v.price_per_m2)}/m²</strong>
                  </div>
                  {v.price_per_m2 > 0 && (
                    <div className="flex w-full justify-between items-center mt-2 border-t border-slate-200 pt-2">
                      <div className="text-gold font-bold text-lg">
                        = {fmt(quoteM2(v.price_per_m2, largura, altura))} <span className="text-xs text-slate-400 font-normal">({largura}×{altura}m)</span>
                      </div>
                      <button onClick={() => handleBuy(p.name, v)} className="bg-black text-white px-4 py-2 rounded-md font-bold hover:bg-slate-800 transition-colors">
                        Comprar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* MODAL DE CHECKOUT */}
      {selectedVariant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold font-montserrat">Finalizar Compra</h2>
              <button onClick={() => setSelectedVariant(null)} className="text-slate-400 hover:text-black">✕</button>
            </div>
            
            {!pixData ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800">{selectedProductName}</p>
                  <p className="text-sm text-slate-600">Medida: {largura}m x {altura}m</p>
                  <p className="text-gold font-bold text-lg mt-1">{fmt(finalPrice)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calcular Frete (CEP)</label>
                  <div className="flex gap-2">
                    <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="Ex: 74000-000" className="flex-1 p-2 border border-slate-300 rounded-md" />
                    <button onClick={calcShipping} disabled={loadingShipping} className="bg-slate-200 px-4 rounded-md font-bold text-slate-700 hover:bg-slate-300">
                      {loadingShipping ? '...' : 'OK'}
                    </button>
                  </div>
                </div>

                {shippingQuotes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Opções de entrega (Frenet):</p>
                    {shippingQuotes.map((q, i) => (
                      <label key={i} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${selectedQuote === q ? 'border-gold bg-yellow-50' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="shipping" checked={selectedQuote === q} onChange={() => setSelectedQuote(q)} />
                          <span className="text-sm font-medium">{q.carrier} ({q.deadline} dias)</span>
                        </div>
                        <span className="font-bold text-slate-700">{fmt(q.price)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {selectedQuote && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium">Dados para Pagamento (Cakto)</p>
                    <input type="text" placeholder="Nome Completo" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                    <input type="email" placeholder="E-mail" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                    <div className="flex gap-2">
                      <input type="text" placeholder="CPF/CNPJ" value={customer.docNumber} onChange={e => setCustomer({...customer, docNumber: e.target.value})} className="w-1/2 p-2 border border-slate-300 rounded-md text-sm" />
                      <input type="text" placeholder="WhatsApp" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-1/2 p-2 border border-slate-300 rounded-md text-sm" />
                    </div>
                    
                    <button onClick={generatePix} disabled={loadingPix} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors mt-2">
                      {loadingPix ? 'Gerando PIX...' : `Pagar ${fmt(finalPrice + selectedQuote.price)} via PIX`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <h3 className="font-bold text-green-600 text-xl">PIX Gerado com Sucesso!</h3>
                <p className="text-sm text-slate-600">Copie o código abaixo ou escaneie no seu app do banco.</p>
                {pixData.mock && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">Modo Simulação (Sem chaves da API)</span>}
                <div className="bg-slate-100 p-4 rounded-lg break-all text-xs font-mono text-slate-700 border border-slate-300">
                  {pixData.pixCode}
                </div>
                <button onClick={() => navigator.clipboard.writeText(pixData.pixCode)} className="bg-black text-white font-bold py-2 px-6 rounded-md hover:bg-slate-800">
                  Copiar Código PIX
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
