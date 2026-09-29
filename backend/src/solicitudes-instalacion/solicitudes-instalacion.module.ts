import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportacionSolicitudesService } from './importacion-solicitudes.service';
import { SolicitudesInstalacionController } from './solicitudes-instalacion.controller';
import { SolicitudesInstalacionService } from './solicitudes-instalacion.service';
import { NormalizacionSolicitudesService } from './normalizacion-solicitudes.service';
import { TareasOperativasModule } from '../tareas-operativas/tareas-operativas.module';
import { GeneracionTareasInstalacionService } from './generacion-tareas-instalacion.service';
import { FormsSolicitudesController } from './forms-solicitudes.controller';
import { FormsIntegrationKeyGuard } from './forms-integration-key.guard';

@Module({
  imports: [PrismaModule, TareasOperativasModule],
  controllers: [SolicitudesInstalacionController, FormsSolicitudesController],
  providers: [
    SolicitudesInstalacionService,
    ImportacionSolicitudesService,
    NormalizacionSolicitudesService,
    GeneracionTareasInstalacionService,
    FormsIntegrationKeyGuard,
  ],
  exports: [SolicitudesInstalacionService],
})
export class SolicitudesInstalacionModule {}
