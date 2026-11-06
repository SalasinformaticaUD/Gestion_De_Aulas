// Módulo del feature monitoreo-software. Agrupa el controlador y el servicio
// del endpoint de filtros y provee el reloj (`RELOJ_MONITOREO`) usado por la
// caché del servicio. No importa `SoftrackerDbModule` porque está declarado
// como módulo global, por lo que `SoftrackerDbService` ya es inyectable aquí.
import { Module } from '@nestjs/common';

import { RELOJ_MONITOREO } from './monitoreo-software.constants';
import { MonitoreoSoftwareController } from './monitoreo-software.controller';
import { MonitoreoSoftwareService } from './monitoreo-software.service';

@Module({
  controllers: [MonitoreoSoftwareController],
  providers: [
    MonitoreoSoftwareService,
    { provide: RELOJ_MONITOREO, useValue: () => Date.now() },
  ],
})
export class MonitoreoSoftwareModule {}
