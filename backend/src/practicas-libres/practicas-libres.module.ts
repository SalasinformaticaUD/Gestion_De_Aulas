import { Module } from '@nestjs/common';
import { PracticasLibresService } from './practicas-libres.service';
import { PracticasLibresController } from './practicas-libres.controller';
import { DisponibilidadAulasModule } from '../disponibilidad-aulas/disponibilidad-aulas.module';
import { PracticasLibresEmailService } from './practicas-libres-email.service';
import { EstudiantesModule } from '../estudiantes/estudiantes.module';

@Module({
  imports: [DisponibilidadAulasModule, EstudiantesModule],
  controllers: [PracticasLibresController],
  providers: [PracticasLibresService, PracticasLibresEmailService],
  exports: [PracticasLibresService],
})
export class PracticasLibresModule {}
