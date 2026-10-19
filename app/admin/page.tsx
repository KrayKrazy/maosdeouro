'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATALOG, CatalogProduct } from '@/data/products';

export default function AdminDashboard() {
  const [products, setProducts] = useState<CatalogProduct[]>(CATALOG);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Form State (com metadados de Peso e Medidas para cálculo de frete)
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Portas' | 'Janelas' | 'Espelhos'>('Portas');
  const [baseSku, setBaseSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [weightKg, setWeightKg] = useState<number>(30);
  const [lengthCm, setLengthCm] = useState<number>(210);
  const [widthCm, setWidthCm] = useState<number>(80);
  const [heightCm, setHeightCm] = useState<number>(12);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data } = await supabase.from('products').select('*, variants(*)').order('name');
      if (data && data.length > 0) {
        const skuMap = new Map<string, number>();
        for (const sp of data) {
          if (Array.isArray(sp.variants)) {
            for (const sv of sp.variants) {
              if (sv.sku && Number(sv.price_per_m2 || sv.price) > 0) {
                skuMap.set(sv.sku, Number(sv.price || sv.price_per_m2));
              }
            }
          }
        }
        const merged = CATALOG.map((cp) => {
          const updatedVars = cp.variants.map((v) => ({
            ...v,
            price: skuMap.get(v.sku) ?? v.price,
          }));
          return {
            ...cp,
            from_price: Math.min(...updatedVars.map((u) => u.price)),
            variants: updatedVars,
          };
        });
        setProducts(merged);
      } else {
        setProducts(CATALOG);
      }
    } catch (e) {
      setProducts(CATALOG);
    }
    setLoading(false);
  }

  async function updateVariantPrice(sku: string, newPriceStr: string) {
    const price = parseFloat(newPriceStr);
    if (isNaN(price) || price <= 0) return;

    // Atualiza estado local imediatamente
    setProducts((prev) =>
      prev.map((p) => {
        const updatedVars = p.variants.map((v) => (v.sku === sku ? { ...v, price } : v));
        return {
          ...p,
          from_price: Math.min(...updatedVars.map((u) => u.price)),
          variants: updatedVars,
        };
      })
    );

    // Sincroniza no Supabase (usa coluna price_per_m2 por compatibilidade com schema atual do banco)
    const { error } = await supabase.from('variants').update({ price_per_m2: price }).eq('sku', sku);
    if (!error) {
      setStatusMsg(`Preço da tipologia ${sku} atualizado para R$ ${price.toFixed(2)}`);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }

  async function syncStandardCatalogToSupabase() {
    setSyncing(true);
    setStatusMsg('Sincronizando os 4 Super-Produtos e Tipologias com o banco Supabase...');
    try {
      for (const prod of products) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('base_sku', prod.base_sku)
          .single();

        let productId = existing?.id;

        if (!productId) {
          const { data: inserted } = await supabase
            .from('products')
            .insert({
              name: prod.name,
              base_sku: prod.base_sku,
              type: 'CUSTOM_PROJECT',
              unit: 'UN',
              category: prod.category,
              image_url: prod.image,
            })
            .select('id')
            .single();
          productId = inserted?.id;
        }

        if (productId) {
          for (const v of prod.variants) {
            const { data: exVar } = await supabase.from('variants').select('id').eq('sku', v.sku).single();
            if (exVar?.id) {
              await supabase
                .from('variants')
                .update({
                  modelo: v.tipologia,
                  aluminio: v.cores.join('/'),
                  vidro: v.medidas.map((m) => m.label).join(' | '),
                  price_per_m2: v.price,
                })
                .eq('id', exVar.id);
            } else {
              await supabase.from('variants').insert({
                product_id: productId,
                sku: v.sku,
                modelo: v.tipologia,
                aluminio: v.cores.join('/'),
                vidro: v.medidas.map((m) => m.label).join(' | '),
                linha: v.linha || 'Suprema',
                price_per_m2: v.price,
              });
            }
          }
        }
      }
      setStatusMsg('Catálogo de 4 Super-Produtos sincronizado com sucesso no Supabase!');
    } catch (e: any) {
      setStatusMsg('Catálogo salvo localmente (verifique permissões RLS para escrita no Supabase).');
    } finally {
      setSyncing(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  }

  function openEditModal(product: CatalogProduct) {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setBaseSku(product.base_sku);
    setImageUrl(product.image || '');
    setWeightKg(product.weight_kg || 30);
    setLengthCm(product.length_cm || 210);
    setWidthCm(product.width_cm || 80);
    setHeightCm(product.height_cm || 12);
    setIsModalOpen(true);
  }

  function saveProductMetadata() {
    if (!editingProduct) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.base_sku === editingProduct.base_sku
          ? {
              ...p,
              name,
              category,
              image: imageUrl,
              weight_kg: weightKg,
              length_cm: lengthCm,
              width_cm: widthCm,
              height_cm: heightCm,
            }
          : p
      )
    );
    setIsModalOpen(false);
    setStatusMsg('Metadados de cubagem e produto atualizados!');
    setTimeout(() => setStatusMsg(null), 3000);
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white">Gestão dos 4 Super-Produtos &amp; Cubagem de Frete</h2>
          <p className="text-sm text-gray-400 mt-1">
            Ajuste os preços base das tipologias em tamanho padrão e confira as dimensões de frete (Altura, Largura, Profundidade e Peso Bruto).
          </p>
        </div>
        <button
          onClick={syncStandardCatalogToSupabase}
          disabled={syncing}
          className="bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold py-2.5 px-5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar Catálogo com Banco'}
        </button>
      </div>

      {statusMsg && (
        <div className="mb-6 p-4 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] text-[#D4AF37] text-sm font-medium">
          {statusMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#D4AF37] animate-pulse">Carregando estrutura de produtos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {products.map((p) => (
            <div
              key={p.base_sku}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col lg:flex-row"
            >
              <div className="w-full lg:w-64 bg-[#111] p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
                <div>
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black mb-4">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover opacity-90" />
                    <div className="absolute top-2 left-2 bg-black/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded text-[#D4AF37] border border-[#D4AF37]/30">
                      {p.category}
                    </div>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-white leading-snug">{p.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">SKU: {p.base_sku}</p>
                </div>

                {/* Metadados de Cubagem (Pedido 1 - Item 2) */}
                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-300 space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold block mb-1">
                    Cubagem Padrão (Frete API)
                  </span>
                  <div>Peso Bruto Médio: <strong>{p.weight_kg} kg</strong></div>
                  <div>Altura Emb.: <strong>{p.length_cm} cm</strong></div>
                  <div>Largura Emb.: <strong>{p.width_cm} cm</strong></div>
                  <div>Profundidade: <strong>{p.height_cm} cm</strong></div>
                  <button
                    onClick={() => openEditModal(p)}
                    className="w-full mt-3 text-xs text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/40 rounded-lg py-2 font-bold uppercase tracking-wider transition-all"
                  >
                    Editar Cubagem / Dados
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1">
                <h4 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-4">
                  Tipologias, Medidas Padrão &amp; Preço Base (Unidade)
                </h4>
                <div className="bg-[#111] border border-white/10 rounded-xl divide-y divide-white/10">
                  {p.variants.map((v) => (
                    <div
                      key={v.sku}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-sm text-white font-bold block">{v.tipologia}</span>
                        <span className="text-xs text-gray-400 block">
                          Ambiente: {v.uso} • Cores: {v.cores.join(', ')}
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {v.medidas.map((m) => (
                            <span
                              key={m.label}
                              className="text-[11px] bg-black px-2 py-0.5 rounded border border-white/10 text-gray-300"
                            >
                              {m.label} ({m.weight_kg}kg / {m.height_cm}x{m.width_cm}x{m.depth_cm}cm)
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-xs text-gray-400">Preço Base R$</span>
                        <input
                          type="number"
                          defaultValue={v.price}
                          onBlur={(e) => {
                            if (e.target.value !== String(v.price)) {
                              updateVariantPrice(v.sku, e.target.value);
                            }
                          }}
                          className="bg-black border border-white/15 rounded-lg px-3 py-2 w-28 text-right text-[#D4AF37] font-bold focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição de Metadados de Peso e Medidas */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-white/15 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-serif text-white">Metadados do Produto &amp; Cubagem de Frete</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Nome do Super-Produto
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-white/15 rounded-lg bg-[#141414] text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Peso Bruto (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full p-3 border border-white/15 rounded-lg bg-[#141414] text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Altura Embalagem (cm)
                  </label>
                  <input
                    type="number"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(Number(e.target.value))}
                    className="w-full p-3 border border-white/15 rounded-lg bg-[#141414] text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Largura Embalagem (cm)
                  </label>
                  <input
                    type="number"
                    value={widthCm}
                    onChange={(e) => setWidthCm(Number(e.target.value))}
                    className="w-full p-3 border border-white/15 rounded-lg bg-[#141414] text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Profundidade/Espessura (cm)
                  </label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full p-3 border border-white/15 rounded-lg bg-[#141414] text-white text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#080808]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={saveProductMetadata}
                className="bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold py-2.5 px-6 rounded-lg text-sm"
              >
                Salvar Metadados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
