import { Module } from '@nestjs/common';
import { PrestamosDocentesService } from './prestamos-docentes.service';
import { PrestamosDocentesController } from './prestamos-docentes.controller';

@Module({
  controllers: [PrestamosDocentesController],
  providers: [PrestamosDocentesService],
})
export class PrestamosDocentesModule {}
