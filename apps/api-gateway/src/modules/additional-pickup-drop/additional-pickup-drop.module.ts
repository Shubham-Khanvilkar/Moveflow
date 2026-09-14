import { Module } from '@nestjs/common';
import { AdditionalPickupDropService } from './additional-pickup-drop.service';
import { AdditionalPickupDropController } from './additional-pickup-drop.controller';

@Module({
  controllers: [AdditionalPickupDropController],
  providers: [AdditionalPickupDropService],
  exports: [AdditionalPickupDropService],
})
export class AdditionalPickupDropModule {}
