'use client';
import { useState } from 'react';
import { CATALOG, quoteM2 } from '../data/products';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Catalogo() {
  const [largura, setLargura] = useState(2);
  const [altura, setAltura] = useState(2.5);

  return (
    <section className="py-12 px-6 max-w-5xl mx-auto">
      <h1 className="font-montserrat text-3xl font-bold text-black mb-4">Catálogo — Preço por m² e sob medida</h1>
      <p className="text-slate-600 mb-8 text-lg">
        Fabricação própria em Goiânia. Informe as medidas abaixo para estimar o valor final.
        Peças grandes possuem entrega local (Goiânia e Região) ou cotação via transportadora.{' '}
        <a href="https://wa.me/5562981244675" className="text-gold font-bold hover:underline">Orçamento grátis no WhatsApp</a>
      </p>

      <div className="flex gap-4 mb-10 p-6 bg-white shadow-sm border border-slate-200 rounded-xl">
        <label className="flex flex-col font-medium text-slate-700">
          Largura (m)
          <input type="number" step="0.1" min="0.5" value={largura}
            className="mt-1 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold/50"
            onChange={(e) => setLargura(Number(e.target.value))} />
        </label>
        <label className="flex flex-col font-medium text-slate-700">
          Altura (m)
          <input type="number" step="0.1" min="0.5" value={altura}
            className="mt-1 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold/50"
            onChange={(e) => setAltura(Number(e.target.value))} />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {CATALOG.map((p) => (
          <article key={p.base_sku} className="border border-slate-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow">
            <h2 className="font-montserrat font-bold text-xl mb-1">{p.name}</h2>
            <p className="text-slate-500 mb-4 text-sm font-medium">A partir de {fmt(p.from_price_per_m2)}/m²</p>
            <ul className="space-y-3">
              {p.variants.map((v) => (
                <li key={v.sku} className="text-sm p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-700 mb-1">
                    {[v.aluminio, v.vidro, v.linha, v.modelo].filter(Boolean).join(' • ')} —{' '}
                    <strong className="text-black">{fmt(v.price_per_m2)}/m²</strong>
                  </div>
                  {v.price_per_m2 > 0 && (
                    <div className="text-gold font-bold text-lg">
                      = {fmt(quoteM2(v.price_per_m2, largura, altura))} <span className="text-xs text-slate-400 font-normal">({largura}×{altura}m)</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
