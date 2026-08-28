import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { PlantillasPdfService } from './plantillas-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportesController],
  providers: [ReportesService, PlantillasPdfService],
})
export class ReportesModule {}
