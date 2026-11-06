// Controller del módulo monitoreo-software.
//
// Expone `GET /monitoreo-software/filtros`. El acceso al módulo se restringe con
// `@RequireModule(MODULOS.MONITOREO_SOFTWARE)` y la lectura con
// `@RequirePermissions(PERMISO_MONITOREO_LEER)`; ambos los evalúan los guards
// globales antes de llegar al handler (Req. 4.1, 4.2). El endpoint no recibe
// query params y delega íntegramente en el servicio.

import { Controller, Get } from '@nestjs/common';

import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MonitoreoSoftwareService } from './monitoreo-software.service';
import { PERMISO_MONITOREO_LEER } from './monitoreo-software.constants';
import { RespuestaFiltros } from './monitoreo-software.types';

@RequireModule(MODULOS.MONITOREO_SOFTWARE)
@Controller('monitoreo-software')
export class MonitoreoSoftwareController {
  constructor(private readonly service: MonitoreoSoftwareService) {}

  @Get('filtros')
  @RequirePermissions(PERMISO_MONITOREO_LEER)
  obtenerFiltros(): Promise<RespuestaFiltros> {
    return this.service.obtenerFiltros();
  }
}
