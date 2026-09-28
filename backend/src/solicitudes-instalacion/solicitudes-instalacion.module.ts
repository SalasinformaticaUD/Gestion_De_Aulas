import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportacionSolicitudesService } from './importacion-solicitudes.service';
import { SolicitudesInstalacionController } from './solicitudes-instalacion.controller';
import { SolicitudesInstalacionService } from './solicitudes-instalacion.service';
import { NormalizacionSolicitudesService } from './normalizacion-solicitudes.service';
import { TareasOperativasModule } from '../tareas-operativas/tareas-operativas.module';
import { GeneracionTareasInstalacionService } from './generacion-tareas-instalacion.service';

@Module({
  imports: [PrismaModule, TareasOperativasModule],
  controllers: [SolicitudesInstalacionController],
  providers: [
    SolicitudesInstalacionService,
    ImportacionSolicitudesService,
    NormalizacionSolicitudesService,
    GeneracionTareasInstalacionService,
  ],
  exports: [SolicitudesInstalacionService],
})
export class SolicitudesInstalacionModule {}
