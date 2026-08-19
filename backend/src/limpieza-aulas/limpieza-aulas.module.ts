import { Module } from '@nestjs/common';
import { LimpiezaAulasService } from './limpieza-aulas.service';
import { LimpiezaAulasController } from './limpieza-aulas.controller';

@Module({
  controllers: [LimpiezaAulasController],
  providers: [LimpiezaAulasService],
})
export class LimpiezaAulasModule {}
