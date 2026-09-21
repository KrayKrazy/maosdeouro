import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  
  // TODO: Conectar ao n8n ou webhook do Chatwoot da M�os de Ouro
  console.log('?? NOVA VENDA REGISTRADA:', body);

  return NextResponse.json({ success: true, message: 'Alerta enviado para a equipe.' });
}
