import { Module } from '@nestjs/common';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';
import { DisponibilidadAulasController } from './disponibilidad-aulas.controller';

@Module({
  controllers: [DisponibilidadAulasController],
  providers: [DisponibilidadAulasService],
})
export class DisponibilidadAulasModule {}
