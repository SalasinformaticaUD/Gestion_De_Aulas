import { Module } from '@nestjs/common';
import { IntegracionesController } from './integraciones.controller';
import { MonitoresClientService } from './monitores-client.service';

@Module({
  controllers: [IntegracionesController],
  providers: [MonitoresClientService],
  exports: [MonitoresClientService],
})
export class IntegracionesModule {}
