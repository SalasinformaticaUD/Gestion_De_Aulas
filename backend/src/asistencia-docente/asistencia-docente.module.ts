import { Module } from '@nestjs/common';
import { AsistenciaDocenteService } from './asistencia-docente.service';
import { AsistenciaDocenteController } from './asistencia-docente.controller';

@Module({
  controllers: [AsistenciaDocenteController],
  providers: [AsistenciaDocenteService],
})
export class AsistenciaDocenteModule {}
