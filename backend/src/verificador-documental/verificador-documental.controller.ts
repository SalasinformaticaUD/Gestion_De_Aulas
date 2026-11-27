import { CargaPdfInterceptor } from './carga-pdf.interceptor';
import type { ArchivoPdfRecibido } from './pdf-validation.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { MODULOS } from '../auth/auth.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CreateVerificacionDto } from './dto/create-verificacion.dto';
import { FindVerificacionesDto } from './dto/find-verificaciones.dto';
import { VerificadorDocumentalService } from './verificador-documental.service';
import { DocumentalAccessGuard } from './documental-access.guard';
import { DocumentalExceptionFilter } from './documental-exception.filter';
import { DescartarPdfInterceptor } from './descartar-pdf.interceptor';

@RequireAuth()
@UseGuards(DocumentalAccessGuard)
@UseFilters(DocumentalExceptionFilter)
@RequireModule(MODULOS.VERIFICADOR_DOCUMENTAL)
@Controller('verificador-documental')
export class VerificadorDocumentalController {
  constructor(private readonly service: VerificadorDocumentalService) {}

  @Get('catalogos')
  @RequirePermissions('VERIFICADOR_DOCUMENTAL_LEER')
  catalogos() {
    return this.service.catalogos();
  }

  @Post('verificaciones')
  @RequirePermissions(
    'VERIFICADOR_DOCUMENTAL_LEER',
    'VERIFICADOR_DOCUMENTAL_CREAR',
  )
  create(
    @Body() dto: CreateVerificacionDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.create(dto, usuario.id);
  }

  @Post('verificaciones/:id/procesar')
  @RequirePermissions(
    'VERIFICADOR_DOCUMENTAL_LEER',
    'VERIFICADOR_DOCUMENTAL_CREAR',
  )
  @UseInterceptors(DescartarPdfInterceptor, CargaPdfInterceptor)
  procesar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() archivos: ArchivoPdfRecibido[] | undefined,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.procesar(id, archivos, usuario.id);
  }

  @Get('verificaciones')
  @RequirePermissions('VERIFICADOR_DOCUMENTAL_LEER')
  findAll(@Query() filtros: FindVerificacionesDto) {
    return this.service.findAll(filtros);
  }

  @Get('verificaciones/:id')
  @RequirePermissions('VERIFICADOR_DOCUMENTAL_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Delete('verificaciones/:id')
  @RequirePermissions(
    'VERIFICADOR_DOCUMENTAL_LEER',
    'VERIFICADOR_DOCUMENTAL_ELIMINAR',
  )
  eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.eliminar(id, usuario.id);
  }
}
