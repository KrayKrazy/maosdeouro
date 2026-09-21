"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, variants(*)')
      .order('name');
    
    if (data) setProducts(data);
    setLoading(false);
  }

  async function updatePrice(variantId: string, newPrice: string) {
    const price = parseFloat(newPrice);
    if(isNaN(price)) return;
    
    await supabase.from('variants').update({ price_per_m2: price }).eq('id', variantId);
    fetchProducts(); // refresh
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white">Catálogo de Produtos</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie os itens, variações e preços por metro quadrado.</p>
        </div>
        <button className="bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold py-2 px-4 rounded text-sm transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          + Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#D4AF37] animate-pulse">Carregando catálogo...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="w-full md:w-48 h-48 bg-[#111] relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs uppercase tracking-widest">Sem Imagem</div>
                )}
                <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 text-xs rounded text-[#D4AF37] border border-[#D4AF37]/30">
                  {p.category}
                </div>
              </div>
              
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-serif text-white">{p.name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">SKU: {p.base_sku}</p>
                  </div>
                  <button className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 rounded px-3 py-1 transition-colors">
                    Editar Produto
                  </button>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Variantes & Preços (R$ / {p.unit})</h4>
                  <div className="bg-[#111] border border-white/5 rounded-lg divide-y divide-white/5">
                    {p.variants && p.variants.map((v: any) => (
                      <div key={v.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-300 font-medium">{v.vidro || v.aluminio || v.linha || v.modelo || 'Padrão'}</span>
                          <span className="text-xs text-gray-500 font-mono">SKU: {v.sku}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">R$</span>
                          <input 
                            type="number" 
                            defaultValue={v.price_per_m2}
                            onBlur={(e) => {
                              if(e.target.value !== String(v.price_per_m2)) {
                                updatePrice(v.id, e.target.value);
                              }
                            }}
                            className="bg-black border border-white/10 rounded px-3 py-1.5 w-28 text-right text-[#D4AF37] font-medium focus:outline-none focus:border-[#D4AF37]/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
