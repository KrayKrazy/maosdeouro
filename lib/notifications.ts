import nodemailer from 'nodemailer';

export interface OrderNotificationPayload {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerDoc?: string;
  items: any[];
  subtotal?: number;
  shippingPrice?: number;
  carrier?: string;
  total: number;
  address: string;
  isInstallation?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
}

export async function sendOrderNotifications(payload: OrderNotificationPayload) {
  const {
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    customerDoc,
    items = [],
    shippingPrice = 0,
    carrier = 'A definir',
    total,
    address,
    isInstallation,
    paymentMethod = 'pix',
    paymentStatus = 'APROVADO',
  } = payload;

  const results: { emailSent: boolean; webhookSent: boolean; errors: string[] } = {
    emailSent: false,
    webhookSent: false,
    errors: [],
  };

  // 1. Disparo de Webhook Externo (n8n / WhatsApp / CRM) se configurado
  const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
  if (ALERT_WEBHOOK_URL) {
    try {
      await fetch(ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.paid',
          timestamp: new Date().toISOString(),
          ...payload,
        }),
      });
      results.webhookSent = true;
    } catch (err: any) {
      results.errors.push(`Webhook error: ${err.message}`);
    }
  }

  // 2. Disparo de E-mail (Ordem de Serviço p/ Fábrica + Comprovante p/ Cliente)
  const EMAIL_USER = process.env.EMAIL_USER || 'contato@maosdeouro.com.br';
  const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

  if (!EMAIL_APP_PASSWORD || EMAIL_APP_PASSWORD === 'SUA_SENHA_DE_APP_GMAIL_AQUI') {
    results.errors.push('EMAIL_APP_PASSWORD não configurado no ambiente.');
    return results;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_APP_PASSWORD,
      },
    });

    const itemsHtml = items
      .map((item: any) => {
        const specs = [
          item.tipologia,
          item.medida,
          item.cor ? `Cor: ${item.cor}` : null,
          item.lado ? `Lado: ${item.lado}` : null,
          item.arremate && item.arremate !== 'Sem arremate' ? item.arremate : null,
        ]
          .filter(Boolean)
          .join(' • ');

        const qty = item.quantity || 1;
        const unitPrice = Number(item.unitPrice || item.unit_price || item.price || 0).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        });

        return `
          <tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #ddd;">
              <strong>${item.product || item.name}</strong><br/>
              <span style="font-size: 12px; color: #555;">${specs}</span>
            </td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #ddd; text-align: center;">${qty}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${unitPrice}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #222; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-bottom: 3px solid #D4AF37;">
          <h1 style="color: #D4AF37; margin: 0; font-family: Georgia, serif; letter-spacing: 2px;">MÃOS DE OURO ESQUADRIAS</h1>
          <p style="color: #ccc; margin: 6px 0 0; font-size: 13px;">Comprovante de Pedido &amp; Ordem de Produção</p>
        </div>
        
        <div style="padding: 28px;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #D4AF37;">
            <p style="margin: 4px 0;"><strong>Pedido / OS Nº:</strong> #${String(orderId).substring(0, 8).toUpperCase()}</p>
            <p style="margin: 4px 0;"><strong>Status do Pagamento:</strong> <span style="color: #008a45; font-weight: bold;">${paymentStatus} (${paymentMethod.toUpperCase()})</span></p>
            <p style="margin: 4px 0;"><strong>Modalidade:</strong> ${isInstallation ? 'ENTREGA + INSTALAÇÃO TÉCNICA' : 'ENVIO PADRONIZADO / ENTREGA'}</p>
          </div>

          <h3 style="margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 6px; color: #111;">Dados do Cliente &amp; Entrega</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Cliente:</strong> ${customerName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>E-mail:</strong> ${customerEmail}</p>
          ${customerPhone ? `<p style="margin: 4px 0; font-size: 14px;"><strong>WhatsApp/Tel:</strong> ${customerPhone}</p>` : ''}
          ${customerDoc ? `<p style="margin: 4px 0; font-size: 14px;"><strong>CPF/CNPJ:</strong> ${customerDoc}</p>` : ''}
          <p style="margin: 4px 0; font-size: 14px;"><strong>Endereço de Entrega:</strong> ${address}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Transportadora / Frete:</strong> ${carrier} (R$ ${Number(shippingPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</p>
          
          <h3 style="margin-top: 25px; border-bottom: 2px solid #D4AF37; padding-bottom: 6px; color: #111;">Especificações das Esquadrias</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f4f4f4;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Produto / Especificação</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Qtd</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Valor Unit.</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right; color: #555;">Frete (${carrier}):</td>
                <td style="padding: 10px; text-align: right; color: #555;">R$ ${Number(shippingPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px;">VALOR TOTAL:</td>
                <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px; color: #b59020;">R$ ${Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="font-size: 12px; color: #666; text-align: center; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            Mãos de Ouro Esquadrias — Atendimento WhatsApp: +55 (62) 99925-7513
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Mãos de Ouro Esquadrias" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      bcc: customerEmail || undefined,
      subject: `[PEDIDO #${String(orderId).substring(0, 6).toUpperCase()}] Mãos de Ouro Esquadrias - ${customerName}`,
      html: htmlContent,
    });

    results.emailSent = true;
  } catch (err: any) {
    results.errors.push(`SMTP error: ${err.message}`);
  }

  return results;
}
