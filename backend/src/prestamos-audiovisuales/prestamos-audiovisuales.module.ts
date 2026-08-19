import { Module } from '@nestjs/common';
import { PrestamosAudiovisualesService } from './prestamos-audiovisuales.service';
import { PrestamosAudiovisualesController } from './prestamos-audiovisuales.controller';

@Module({
  controllers: [PrestamosAudiovisualesController],
  providers: [PrestamosAudiovisualesService],
})
export class PrestamosAudiovisualesModule {}
