import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';

// Webhooks Cakto: purchase_approved, purchase_refused, pix_gerado, refund, chargeback
// Após purchase_approved -> atualizar Order para PAYMENT_CONFIRMED e disparar n8n.
@Controller('api/webhooks/cakto')
export class WebhooksController {
  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: any,
    @Headers('x-cakto-secret') secret: string,
  ) {
    if (secret !== process.env.CAKTO_WEBHOOK_SECRET) {
      return { ok: false, error: 'invalid secret' };
    }
    const event = body?.event ?? body?.type ?? 'unknown';

    // TODO: Prisma: salvar em WebhookEvent + atualizar Order pelo cakto_order_id
    // if (event === 'purchase_approved') {
    //   await prisma.order.update({ where: { cakto_order_id: body.data.id }, data: { status: 'PAYMENT_CONFIRMED' } });
    //   await fetch(process.env.N8N_WEBHOOK_URL!, { method: 'POST', body: JSON.stringify(body) });
    // }

    return { ok: true, event };
  }
}
