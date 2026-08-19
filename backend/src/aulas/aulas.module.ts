import { Module } from '@nestjs/common';
import { AulasService } from './aulas.service';
import { AulasController } from './aulas.controller';

@Module({
  controllers: [AulasController],
  providers: [AulasService],
})
export class AulasModule {}
