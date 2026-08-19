import { Module } from '@nestjs/common';
import { MultasService } from './multas.service';
import { MultasController } from './multas.controller';

@Module({
  controllers: [MultasController],
  providers: [MultasService],
})
export class MultasModule {}
