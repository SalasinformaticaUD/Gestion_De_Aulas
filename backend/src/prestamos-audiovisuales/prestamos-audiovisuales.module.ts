import { Module } from '@nestjs/common';
import { PrestamosAudiovisualesService } from './prestamos-audiovisuales.service';
import { PrestamosAudiovisualesController } from './prestamos-audiovisuales.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [PrestamosAudiovisualesController],
  providers: [PrestamosAudiovisualesService],
  exports: [PrestamosAudiovisualesService],
})
export class PrestamosAudiovisualesModule {}
