import { Module } from '@nestjs/common';
import { PracticasLibresService } from './practicas-libres.service';
import { PracticasLibresController } from './practicas-libres.controller';
import { DisponibilidadAulasModule } from '../disponibilidad-aulas/disponibilidad-aulas.module';
import { PracticasLibresEmailService } from './practicas-libres-email.service';

@Module({
  imports: [DisponibilidadAulasModule],
  controllers: [PracticasLibresController],
  providers: [PracticasLibresService, PracticasLibresEmailService],
  exports: [PracticasLibresService],
})
export class PracticasLibresModule {}
