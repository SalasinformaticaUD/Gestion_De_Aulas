import { Module } from '@nestjs/common';
import { DependenciasService } from './dependencias.service';
import { DependenciasController } from './dependencias.controller';

@Module({
  controllers: [DependenciasController],
  providers: [DependenciasService],
})
export class DependenciasModule {}
