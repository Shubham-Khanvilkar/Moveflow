import { Module } from '@nestjs/common';
import { NodalPointsService } from './nodal-points.service';
import { NodalPointsController } from './nodal-points.controller';

@Module({
  controllers: [NodalPointsController],
  providers: [NodalPointsService],
  exports: [NodalPointsService],
})
export class NodalPointsModule {}
