import { Module } from '@nestjs/common';
import { PanelOperativoService } from './panel-operativo.service';
import { PanelOperativoController } from './panel-operativo.controller';
import { DisponibilidadAulasModule } from '../disponibilidad-aulas/disponibilidad-aulas.module';
import { AsistenciaDocenteModule } from '../asistencia-docente/asistencia-docente.module';
import { PrestamosDocentesModule } from '../prestamos-docentes/prestamos-docentes.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    DisponibilidadAulasModule,
    AsistenciaDocenteModule,
    PrestamosDocentesModule,
    PrismaModule,
  ],
  controllers: [PanelOperativoController],
  providers: [PanelOperativoService],
})
export class PanelOperativoModule {}
