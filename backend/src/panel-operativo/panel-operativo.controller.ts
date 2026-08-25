import { Controller, Get, Query } from '@nestjs/common';
import { PanelOperativoService } from './panel-operativo.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import {
  ConsultarAulasPanelOperativoDto,
  ConsultarPanelOperativoDto,
} from './dto/consultar-panel-operativo.dto';

@RequireModule(MODULOS.PANEL_OPERATIVO)
@Controller('panel-operativo')
export class PanelOperativoController {
  constructor(private readonly panelOperativoService: PanelOperativoService) {}

  @Get('resumen')
  resumen(@Query() query: ConsultarPanelOperativoDto) {
    return this.panelOperativoService.resumen(query);
  }

  @Get('aulas')
  aulas(@Query() query: ConsultarAulasPanelOperativoDto) {
    return this.panelOperativoService.aulas(query);
  }

  @Get('alertas')
  alertas(@Query() query: ConsultarPanelOperativoDto) {
    return this.panelOperativoService.alertas(query);
  }
}
