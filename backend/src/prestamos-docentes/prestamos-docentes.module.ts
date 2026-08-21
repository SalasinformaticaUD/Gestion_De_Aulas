import { Module } from '@nestjs/common';
import { PrestamosDocentesService } from './prestamos-docentes.service';
import { PrestamosDocentesController } from './prestamos-docentes.controller';
import { DisponibilidadAulasModule } from '../disponibilidad-aulas/disponibilidad-aulas.module';

@Module({
  imports: [DisponibilidadAulasModule],
  controllers: [PrestamosDocentesController],
  providers: [PrestamosDocentesService],
  exports: [PrestamosDocentesService],
})
export class PrestamosDocentesModule {}
