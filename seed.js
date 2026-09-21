const { createClient } = require('@supabase/supabase-js');
const { CATALOG } = require('./data/products.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seed() {
  console.log('Limpando tabela products...');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Iniciando seed de ' + CATALOG.length + ' produtos...');

  for (const prod of CATALOG) {
    const { data: pData, error: pErr } = await supabase.from('products').insert({
      name: prod.name,
      base_sku: prod.base_sku,
      type: prod.type,
      unit: prod.unit,
      category: prod.category,
      image_url: prod.image
    }).select('id').single();

    if (pErr) {
      console.error('Erro ao inserir produto:', prod.name, pErr);
      continue;
    }

    const variants = prod.variants.map(v => ({
      product_id: pData.id,
      sku: v.sku,
      vidro: v.vidro || null,
      aluminio: v.aluminio || null,
      ferragem: v.ferragem || null,
      linha: v.linha || null,
      modelo: v.modelo || null,
      price_per_m2: v.price_per_m2
    }));

    if (variants.length > 0) {
      const { error: vErr } = await supabase.from('variants').insert(variants);
      if (vErr) console.error('Erro inserindo variantes para', prod.name, vErr);
    }
  }

  console.log('Seed concluído com sucesso!');
}

seed();
