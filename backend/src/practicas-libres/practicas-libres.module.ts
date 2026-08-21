import { Module } from '@nestjs/common';
import { PracticasLibresService } from './practicas-libres.service';
import { PracticasLibresController } from './practicas-libres.controller';
import { DisponibilidadAulasModule } from '../disponibilidad-aulas/disponibilidad-aulas.module';

@Module({
  imports: [DisponibilidadAulasModule],
  controllers: [PracticasLibresController],
  providers: [PracticasLibresService],
})
export class PracticasLibresModule {}
