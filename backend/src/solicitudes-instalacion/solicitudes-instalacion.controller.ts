import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MODULOS } from '../auth/auth.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { FindImportacionesSolicitudesDto } from './dto/find-importaciones-solicitudes.dto';
import { FindSolicitudesInstalacionDto } from './dto/find-solicitudes-instalacion.dto';
import { ImportacionSolicitudesService } from './importacion-solicitudes.service';
import { SolicitudesInstalacionService } from './solicitudes-instalacion.service';
import {
  UpdateItemSolicitudDto,
  UpdateSolicitudInstalacionDto,
} from './dto/update-solicitud-instalacion.dto';
import {
  AprobarSolicitudInstalacionDto,
  RechazarSolicitudInstalacionDto,
} from './dto/aprobar-solicitud-instalacion.dto';
import { GeneracionTareasInstalacionService } from './generacion-tareas-instalacion.service';

@RequireModule(MODULOS.SOLICITUDES_INSTALACION)
@Controller('solicitudes-instalacion')
export class SolicitudesInstalacionController {
  constructor(
    private readonly solicitudesService: SolicitudesInstalacionService,
    private readonly importacionService: ImportacionSolicitudesService,
    private readonly generacionTareasService: GeneracionTareasInstalacionService,
  ) {}

  @Post('importaciones')
  @RequirePermissions('SOLICITUDES_INSTALACION_IMPORTAR')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }),
  )
  importar(
    @UploadedFile()
    archivo:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.importacionService.importarExcel(archivo, usuario?.id);
  }

  @Post('importaciones/previsualizar')
  @RequirePermissions('SOLICITUDES_INSTALACION_IMPORTAR')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }),
  )
  previsualizar(
    @UploadedFile()
    archivo:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
  ) {
    return this.importacionService.previsualizarExcel(archivo);
  }

  @Get('importaciones')
  @RequirePermissions('SOLICITUDES_INSTALACION_LEER')
  findImportaciones(@Query() filtros: FindImportacionesSolicitudesDto) {
    return this.solicitudesService.findImportaciones(filtros);
  }

  @Get('importaciones/:id')
  @RequirePermissions('SOLICITUDES_INSTALACION_LEER')
  findImportacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findImportacion(id);
  }

  @Get('importaciones/:id/resultado.csv')
  @RequirePermissions('SOLICITUDES_INSTALACION_EXPORTAR')
  async exportarImportacion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado | undefined,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const contenido =
      await this.solicitudesService.exportarResultadoImportacion(
        id,
        usuario?.id,
      );
    this.prepararCsv(respuesta, `resultado-importacion-${id}.csv`);
    return contenido;
  }

  @Get('catalogos/normalizacion')
  @RequirePermissions('SOLICITUDES_INSTALACION_LEER')
  findCatalogos() {
    return this.solicitudesService.findCatalogos();
  }

  @Get('exportar')
  @RequirePermissions('SOLICITUDES_INSTALACION_EXPORTAR')
  async exportar(
    @Query() filtros: FindSolicitudesInstalacionDto,
    @CurrentUser() usuario: UsuarioAutenticado | undefined,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const contenido = await this.solicitudesService.exportarSolicitudes(
      filtros,
      usuario?.id,
    );
    this.prepararCsv(respuesta, 'solicitudes-instalacion.csv');
    return contenido;
  }

  @Patch(':id')
  @RequirePermissions('SOLICITUDES_INSTALACION_ACTUALIZAR')
  updateSolicitud(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSolicitudInstalacionDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.solicitudesService.updateSolicitud(id, dto, usuario?.id);
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions('SOLICITUDES_INSTALACION_ACTUALIZAR')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemSolicitudDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.solicitudesService.updateItem(id, itemId, dto, usuario?.id);
  }

  @Post(':id/previsualizar-aprobacion')
  @RequirePermissions('SOLICITUDES_INSTALACION_APROBAR')
  previsualizarAprobacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprobarSolicitudInstalacionDto,
  ) {
    return this.generacionTareasService.previsualizar(id, dto);
  }

  @Post(':id/aprobar')
  @RequirePermissions('SOLICITUDES_INSTALACION_APROBAR')
  aprobar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprobarSolicitudInstalacionDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.generacionTareasService.aprobar(id, dto, usuario?.id);
  }

  @Post(':id/rechazar')
  @RequirePermissions('SOLICITUDES_INSTALACION_RECHAZAR')
  rechazar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RechazarSolicitudInstalacionDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.solicitudesService.rechazar(id, dto.motivo, usuario?.id);
  }

  @Get(':id/tareas')
  @RequirePermissions('SOLICITUDES_INSTALACION_LEER')
  findTareas(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findTareas(id);
  }

  @Post(':id/tareas/:tareaId/confirmar-instalacion')
  @RequirePermissions('SOLICITUDES_INSTALACION_ACTUALIZAR')
  confirmarInstalacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tareaId', ParseUUIDPipe) tareaId: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.generacionTareasService.confirmarInventario(
      id,
      tareaId,
      usuario?.id,
    );
  }

  @Get()
  @RequirePermissions('SOLICITUDES_INSTALACION_LEER')
  findAll(@Query() filtros: FindSolicitudesInstalacionDto) {
    return this.solicitudesService.findAll(filtros);
  }

  @Get(':id')
  @RequirePermissions('SOLICITUDES_INSTALACION_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findOne(id);
  }

  private prepararCsv(respuesta: Response, nombre: string) {
    respuesta.setHeader('Content-Type', 'text/csv; charset=utf-8');
    respuesta.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombre.replaceAll('"', '')}"`,
    );
  }
}
