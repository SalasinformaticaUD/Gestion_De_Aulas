import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { PlantillasPdfService } from './plantillas-pdf.service';
import { ConfiguracionDistribucionPdfController } from './configuracion-distribucion-pdf.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReportesController, ConfiguracionDistribucionPdfController],
  providers: [ReportesService, PlantillasPdfService],
})
export class ReportesModule {}
