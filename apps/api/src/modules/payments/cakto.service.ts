import { Injectable, Logger } from '@nestjs/common';

// Serviço Cakto — espelha a lógica do MCP server para uso em produção.
// Auth: POST /public_api/token/ | Cobrança: POST /public_api/payments/ com X-Idempotency-Key
@Injectable()
export class CaktoService {
  private readonly logger = new Logger(CaktoService.name);
  private token = '';
  private tokenExp = 0;
  private base = process.env.CAKTO_BASE_URL ?? 'https://api.cakto.com.br';

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExp) return this.token;
    const res = await fetch(`${this.base}/public_api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.CAKTO_CLIENT_ID,
        client_secret: process.env.CAKTO_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`Cakto auth: ${res.status}`);
    const data: any = await res.json();
    this.token = data.access_token;
    this.tokenExp = Date.now() + (data.expires_in ?? 3600) * 1000 - 60000;
    return this.token;
  }

  async createPixCharge(input: {
    offerId: string; idempotencyKey: string; customer: any; address?: any;
  }) {
    const token = await this.getToken();
    const res = await fetch(`${this.base}/public_api/payments/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        paymentMethod: 'pix',
        customer: input.customer,
        items: [{ offerId: input.offerId, quantity: 1 }],
        address: input.address,
        pixExpiresIn: 3600,
      }),
    });
    if (!res.ok) throw new Error(`Cakto PIX: ${await res.text()}`);
    return res.json();
  }

  async createCardCharge(input: {
    offerId: string; cardToken: string; idempotencyKey: string; customer: any; address?: any;
  }) {
    const token = await this.getToken();
    const res = await fetch(`${this.base}/public_api/payments/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        paymentMethod: 'credit_card',
        card: { token: input.cardToken },
        customer: input.customer,
        items: [{ offerId: input.offerId, quantity: 1 }],
        address: input.address,
      }),
    });
    if (!res.ok) throw new Error(`Cakto Card: ${await res.text()}`);
    return res.json();
  }
}
