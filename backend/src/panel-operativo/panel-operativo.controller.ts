import { Controller, Get, Query } from '@nestjs/common';
import { PanelOperativoService } from './panel-operativo.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import {
  ConsultarAulasPanelOperativoDto,
  ConsultarPanelOperativoDto,
} from './dto/consultar-panel-operativo.dto';

@RequireModule(MODULOS.PANEL_OPERATIVO)
@Controller('panel-operativo')
export class PanelOperativoController {
  constructor(private readonly panelOperativoService: PanelOperativoService) {}

  @Get('resumen')
  @RequirePermissions('DASHBOARD_LEER')
  resumen(@Query() query: ConsultarPanelOperativoDto) {
    return this.panelOperativoService.resumen(query);
  }

  @Get('aulas')
  @RequirePermissions('DASHBOARD_LEER')
  aulas(@Query() query: ConsultarAulasPanelOperativoDto) {
    return this.panelOperativoService.aulas(query);
  }

  @Get('alertas')
  @RequirePermissions('DASHBOARD_LEER')
  alertas(@Query() query: ConsultarPanelOperativoDto) {
    return this.panelOperativoService.alertas(query);
  }
}
