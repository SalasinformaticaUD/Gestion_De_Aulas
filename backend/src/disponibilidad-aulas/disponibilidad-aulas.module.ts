import { Module } from '@nestjs/common';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';
import { DisponibilidadAulasController } from './disponibilidad-aulas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ObservacionesModule } from '../observaciones/observaciones.module';

@Module({
  imports: [PrismaModule, ObservacionesModule],
  controllers: [DisponibilidadAulasController],
  providers: [DisponibilidadAulasService],
  exports: [DisponibilidadAulasService],
})
export class DisponibilidadAulasModule {}
