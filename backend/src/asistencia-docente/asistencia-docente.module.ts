import { Module } from '@nestjs/common';
import { AsistenciaDocenteService } from './asistencia-docente.service';
import { AsistenciaDocenteController } from './asistencia-docente.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AsistenciaDocenteController],
  providers: [AsistenciaDocenteService],
  exports: [AsistenciaDocenteService],
})
export class AsistenciaDocenteModule {}
