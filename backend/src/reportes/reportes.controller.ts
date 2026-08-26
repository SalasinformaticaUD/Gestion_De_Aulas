import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ConsultarReporteDto } from './dto/consultar-reporte.dto';
import { CodigoReporte, REPORTES, ReportesService } from './reportes.service';

@RequireModule(MODULOS.REPORTES)
@RequirePermissions('REPORTES_LEER')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get(':reporte')
  json(@Param('reporte') reporte: string, @Query() query: ConsultarReporteDto) {
    return this.reportes.consultar(this.codigo(reporte), query);
  }

  @Get(':reporte/csv')
  async csv(
    @Param('reporte') reporte: string,
    @Query() query: ConsultarReporteDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const codigo = this.codigo(reporte);
    const resultado = await this.reportes.consultar(codigo, query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${codigo}.csv"`,
    );
    return this.reportes.aCsv(resultado);
  }

  private codigo(reporte: string): CodigoReporte {
    if (!(REPORTES as readonly string[]).includes(reporte))
      throw new BadRequestException('Tipo de reporte no soportado.');
    return reporte as CodigoReporte;
  }
}
