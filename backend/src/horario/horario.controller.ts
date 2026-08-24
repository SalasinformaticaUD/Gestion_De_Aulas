import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateClaseProgramadaDto } from './dto/create-clase-programada.dto';
import { CreatePeriodoAcademicoDto } from './dto/create-periodo-academico.dto';
import { FindClasesDto } from './dto/find-clases.dto';
import { UpdateClaseProgramadaDto } from './dto/update-clase-programada.dto';
import { UpdatePeriodoAcademicoDto } from './dto/update-periodo-academico.dto';
import { ImportarHorarioDto } from './dto/importar-horario.dto';
import { ImportarHorarioExcelDto } from './dto/importar-horario-excel.dto';
import { HorarioService } from './horario.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule(MODULOS.HORARIOS)
@Controller('horario')
export class HorarioController {
  constructor(private readonly horarioService: HorarioService) {}

  @Get('periodos')
  @RequirePermissions('HORARIOS_LEER')
  findPeriodos() {
    return this.horarioService.findPeriodos();
  }

  @Post('periodos')
  @RequirePermissions('HORARIOS_CREAR')
  createPeriodo(
    @Body() dto: CreatePeriodoAcademicoDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.createPeriodo(dto, usuario?.id);
  }

  @Get('periodos/:id')
  @RequirePermissions('HORARIOS_LEER')
  findPeriodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.findPeriodo(id);
  }

  @Patch('periodos/:id/activar')
  @RequirePermissions('HORARIOS_ACTUALIZAR')
  activarPeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.activarPeriodo(id, usuario?.id);
  }

  @Patch('periodos/:id')
  @RequirePermissions('HORARIOS_ACTUALIZAR')
  updatePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePeriodoAcademicoDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.updatePeriodo(id, dto, usuario?.id);
  }

  @Delete('periodos/:id')
  @RequirePermissions('HORARIOS_ELIMINAR')
  removePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.removePeriodo(id, usuario?.id);
  }

  @Get('clases')
  @RequirePermissions('HORARIOS_LEER')
  findClases(@Query() filters: FindClasesDto) {
    return this.horarioService.findClases(filters);
  }

  @Post('clases')
  @RequirePermissions('HORARIOS_CREAR')
  createClase(
    @Body() dto: CreateClaseProgramadaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.createClase(dto, usuario?.id);
  }

  @Post('importar')
  @RequirePermissions('HORARIOS_CREAR')
  importar(@Body() dto: ImportarHorarioDto) {
    return this.horarioService.importar(dto);
  }

  @Post('importar/excel')
  @RequirePermissions('HORARIOS_CREAR')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 5_000_000 } }),
  )
  importarExcel(
    @UploadedFile()
    archivo:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Body() dto: ImportarHorarioExcelDto,
  ) {
    return this.horarioService.importarExcelOficial(archivo, dto);
  }

  @Patch('clases/:id')
  @RequirePermissions('HORARIOS_ACTUALIZAR')
  updateClase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClaseProgramadaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.updateClase(id, dto, usuario?.id);
  }

  @Delete('clases/:id')
  @RequirePermissions('HORARIOS_ELIMINAR')
  removeClase(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.removeClase(id, usuario?.id);
  }
}
