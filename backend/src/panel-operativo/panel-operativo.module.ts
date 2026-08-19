import { Module } from '@nestjs/common';
import { PanelOperativoService } from './panel-operativo.service';
import { PanelOperativoController } from './panel-operativo.controller';

@Module({
  controllers: [PanelOperativoController],
  providers: [PanelOperativoService],
})
export class PanelOperativoModule {}
