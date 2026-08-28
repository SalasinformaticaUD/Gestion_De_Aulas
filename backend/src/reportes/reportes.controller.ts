import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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

  @Get('practicas-libres/:id/pdf')
  async practicaLibrePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ): Promise<void> {
    const pdf = await this.reportes.generarPracticaLibrePdf(id, usuario);
    this.enviarPdf(response, pdf, `Ficha_PracticaLibre_${id}.pdf`);
  }

  @Get('prestamos-audiovisuales/:id/pdf')
  async prestamoAudiovisualPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const pdf = await this.reportes.generarPrestamoAudiovisualPdf(id);
    this.enviarPdf(response, pdf, `Prestamo_Audiovisual_${id}.pdf`);
  }

  @Get('asistencia-docente/pdf')
  async asistenciaSigudPdf(
    @Query('fecha') fecha: string,
    @Res() response: Response,
  ): Promise<void> {
    const pdf = await this.reportes.generarAsistenciaSigudPdf(fecha);
    this.enviarPdf(response, pdf, `Asistencia_SIGUD_${fecha}.pdf`);
  }

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

  private enviarPdf(response: Response, pdf: Buffer, nombre: string): void {
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre.replaceAll('"', '')}"`,
      'Content-Length': pdf.length.toString(),
    });
    response.status(200).send(pdf);
  }
}
