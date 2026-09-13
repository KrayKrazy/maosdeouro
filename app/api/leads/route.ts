import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, phone, docNumber } = await req.json();

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // Upsert para não duplicar caso o lead tente comprar 2x
    const lead = await prisma.customer.upsert({
      where: { email },
      update: {
        name,
        phone,
        docNumber: docNumber || '',
      },
      create: {
        name,
        email,
        phone,
        docType: docNumber?.length > 14 ? 'cnpj' : 'cpf',
        docNumber: docNumber || '',
        fingerprint: 'web_lead',
      }
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 });
  } catch (error) {
    console.error('Lead Capture Error:', error);
    // Em caso de erro (ex: DB não configurado), retornamos sucesso para não travar a venda
    return NextResponse.json({ error: 'Erro ao salvar lead, prosseguindo fluxo.' }, { status: 200 });
  }
}
