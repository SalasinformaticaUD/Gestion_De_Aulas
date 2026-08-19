import { Module } from '@nestjs/common';
import { PracticasLibresService } from './practicas-libres.service';
import { PracticasLibresController } from './practicas-libres.controller';

@Module({
  controllers: [PracticasLibresController],
  providers: [PracticasLibresService],
})
export class PracticasLibresModule {}
