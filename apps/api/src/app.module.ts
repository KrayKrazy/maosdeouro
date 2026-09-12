import { Module } from '@nestjs/common';
import { CaktoService } from './modules/payments/cakto.service';
import { FrenetService } from './modules/shipping/frenet.service';
import { WebhooksController } from './modules/webhooks/webhooks.controller';

@Module({
  controllers: [WebhooksController],
  providers: [CaktoService, FrenetService],
})
export class AppModule {}
