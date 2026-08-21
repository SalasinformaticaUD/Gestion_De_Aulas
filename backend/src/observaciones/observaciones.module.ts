import { Module } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { ObservacionesController } from './observaciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ObservacionesController],
  providers: [ObservacionesService],
  exports: [ObservacionesService],
})
export class ObservacionesModule {}
