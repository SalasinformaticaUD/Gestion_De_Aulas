import { Module } from '@nestjs/common';
import { PrestamosDocentesService } from './prestamos-docentes.service';
import { PrestamosDocentesController } from './prestamos-docentes.controller';
import { DisponibilidadAulasModule } from '../disponibilidad-aulas/disponibilidad-aulas.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [DisponibilidadAulasModule, AuditoriaModule],
  controllers: [PrestamosDocentesController],
  providers: [PrestamosDocentesService],
  exports: [PrestamosDocentesService],
})
export class PrestamosDocentesModule {}
