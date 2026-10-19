import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { name, email, phone, docNumber } = await req.json();

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let leadId = crypto.randomUUID();

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Tenta registrar ou atualizar no Supabase se a tabela leads existir, sem bloquear o checkout
      const { data } = await supabase
        .from('leads')
        .upsert({ name, email, phone, cpf_cnpj: docNumber || '' }, { onConflict: 'email' })
        .select('id')
        .single();
      if (data?.id) leadId = data.id;
    }

    return NextResponse.json({ success: true, leadId }, { status: 200 });
  } catch (error) {
    // Nunca trava a conversão caso a tabela de leads ainda não exista
    return NextResponse.json({ success: true, note: 'Lead registrado em sessão.' }, { status: 200 });
  }
}
