'use client';
import { useState } from 'react';
import { CATALOG, quoteM2 } from '../data/products';

const fmt = (v: number) =>
  v <= 0 ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Catalogo() {
  const [largura, setLargura] = useState(2);
  const [altura, setAltura] = useState(2.5);

  return (
    <section style={{ padding: '2rem 1.5rem', maxWidth: 1040, margin: '0 auto' }}>
      <h1>Catálogo — preço por m², sob medida</h1>
      <p>
        Fabricação própria em Goiânia. Informe as medidas para estimar o valor.
        Peças grandes: entrega local ou cotação via transportadora.{' '}
        <a href="https://wa.me/5562981244675">Orçamento grátis no WhatsApp</a>
      </p>

      <div style={{ display: 'flex', gap: 12, margin: '1rem 0' }}>
        <label>
          Largura (m){' '}
          <input type="number" step="0.1" min="0.5" value={largura}
            onChange={(e) => setLargura(Number(e.target.value))} />
        </label>
        <label>
          Altura (m){' '}
          <input type="number" step="0.1" min="0.5" value={altura}
            onChange={(e) => setAltura(Number(e.target.value))} />
        </label>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {CATALOG.map((p) => (
          <article key={p.base_sku} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <h2>{p.name}</h2>
            <p style={{ color: '#64748b' }}>A partir de {fmt(p.from_price_per_m2)}/m²</p>
            <ul>
              {p.variants.map((v) => (
                <li key={v.sku}>
                  {[v.aluminio, v.vidro, v.linha, v.modelo].filter(Boolean).join(' • ')} —{' '}
                  <strong>{fmt(v.price_per_m2)}/m²</strong>
                  {v.price_per_m2 > 0 && (
                    <> = <strong>{fmt(quoteM2(v.price_per_m2, largura, altura))}</strong> ({largura}×{altura}m)</>
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
