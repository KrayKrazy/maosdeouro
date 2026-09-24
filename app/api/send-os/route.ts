import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { orderId, customerName, customerEmail, items, total, address, isInstallation } = await req.json();

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'kelevracontato@gmail.com',
        pass: 'dhkl yvij fsrk nwyn', // App Password
      },
    });

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${item.unit_price}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #111; padding: 20px; text-align: center;">
          <h1 style="color: #D4AF37; margin: 0; font-family: serif;">MÃO DE OURO</h1>
          <p style="color: #ccc; margin: 5px 0 0; font-size: 14px;">Esquadrias de Alumínio de Alto Padrão</p>
        </div>
        
        <div style="padding: 30px; border: 1px solid #eee;">
          <h2 style="color: #111; margin-top: 0;">ORDEM DE SERVIÇO - APROVADA</h2>
          <p><strong>OS Nº:</strong> ${orderId}</p>
          <p><strong>Cliente:</strong> ${customerName} (${customerEmail})</p>
          <p><strong>Endereço da Obra/Entrega:</strong> ${address}</p>
          <p><strong>Categoria:</strong> <span style="background: ${isInstallation ? '#D4AF37' : '#eee'}; padding: 3px 8px; border-radius: 4px; font-weight: bold; color: ${isInstallation ? '#000' : '#333'}">${isInstallation ? 'COM INSTALAÇÃO TÉCNICA' : 'APENAS ENTREGA'}</span></p>
          
          <h3 style="margin-top: 30px; border-bottom: 2px solid #D4AF37; padding-bottom: 5px;">Itens do Projeto</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Produto / Esquadria</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Qtd</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Preço Unit.</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">TOTAL:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: #D4AF37;">R$ ${total}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">
            Este é um e-mail automático da Mão de Ouro Esquadrias.<br/>
            Para dúvidas, contate nosso SAC Classe A.
          </p>
        </div>
      </div>
    `;

    // Enviar para a fábrica/operacional e cópia pro cliente
    await transporter.sendMail({
      from: '"Mão de Ouro Esquadrias" <kelevracontato@gmail.com>',
      to: 'kelevracontato@gmail.com', // Envia para a base operacional
      bcc: customerEmail, // Cópia oculta pro cliente
      subject: `[NOVA OS] Pedido Aprovado #${orderId.substring(0,6)} - ${customerName}`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
