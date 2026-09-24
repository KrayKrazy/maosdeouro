"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [baseSku, setBaseSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [requiresInstall, setRequiresInstall] = useState(false);

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
    fetchProducts();
  }

  function openAddModal() {
    setEditingProduct(null);
    setName('');
    setCategory('');
    setBaseSku('');
    setImageUrl('');
    setRequiresInstall(false);
    setIsModalOpen(true);
  }

  function openEditModal(product: any) {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setBaseSku(product.base_sku);
    setImageUrl(product.image_url || '');
    setRequiresInstall(product.requires_install || false);
    setIsModalOpen(true);
  }

  async function saveProduct() {
    const productData = {
      name,
      category,
      base_sku: baseSku,
      image_url: imageUrl,
      requires_install: requiresInstall
    };

    if (editingProduct) {
      await supabase.from('products').update(productData).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([productData]);
    }
    
    setIsModalOpen(false);
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (confirm('Tem certeza que deseja remover este produto?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white">Catálogo de Produtos</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie os itens, variações e preços por metro quadrado.</p>
        </div>
        <button onClick={openAddModal} className="bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold py-2 px-4 rounded text-sm transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          + Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#D4AF37] animate-pulse">Carregando catálogo...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden flex flex-col md:flex-row relative">
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
                    {p.requires_install && (
                      <span className="text-[10px] bg-red-900 text-red-100 px-2 py-0.5 rounded mt-2 inline-block uppercase font-bold tracking-wider">
                        Requer Instalação (+20%)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(p)} className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 rounded px-3 py-1 transition-colors">
                      Editar Produto
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="text-xs text-red-400 hover:text-white border border-red-900 hover:border-red-500 rounded px-3 py-1 transition-colors bg-red-950/30">
                      Remover
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Variantes & Preços</h4>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-serif text-white">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Nome do Produto</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Categoria</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">SKU Base</label>
                  <input type="text" value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">URL da Imagem</label>
                <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-3 border border-white/10 rounded focus:border-[#D4AF37] outline-none bg-[#111] text-white" />
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={requiresInstall} onChange={e => setRequiresInstall(e.target.checked)} className="accent-[#D4AF37] w-4 h-4" />
                  <span className="text-sm text-gray-300">Requer Instalação (+20% ao preço final)</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#050505]">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-transparent hover:border-gray-700 rounded transition-colors">
                Cancelar
              </button>
              <button onClick={saveProduct} className="bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold py-2 px-6 rounded text-sm transition-colors">
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
