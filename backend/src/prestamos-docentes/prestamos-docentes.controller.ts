import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { PrestamosDocentesService } from './prestamos-docentes.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CreatePrestamosDocenteDto } from './dto/create-prestamos-docente.dto';
import { FindPrestamosDocentesDto } from './dto/find-prestamos-docentes.dto';

@RequireAuth()
@RequireModule(MODULOS.PRESTAMOS_DOCENTES)
@Controller('prestamos-docentes')
export class PrestamosDocentesController {
  constructor(
    private readonly prestamosDocentesService: PrestamosDocentesService,
  ) {}

  @Post()
  @RequirePermissions('PRESTAMOS_DOCENTES_CREAR')
  create(
    @Body() createPrestamosDocenteDto: CreatePrestamosDocenteDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.create(
      createPrestamosDocenteDto,
      usuario?.id,
    );
  }

  @Get()
  @RequirePermissions('PRESTAMOS_DOCENTES_LEER')
  findAll(@Query() filters: FindPrestamosDocentesDto) {
    return this.prestamosDocentesService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('PRESTAMOS_DOCENTES_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosDocentesService.findOne(id);
  }

  @Patch(':id/aprobar')
  @RequirePermissions('PRESTAMOS_DOCENTES_APROBAR')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.approve(id, usuario?.id);
  }

  @Patch(':id/cancelar')
  @RequirePermissions('PRESTAMOS_DOCENTES_ACTUALIZAR')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.cancel(id, usuario?.id);
  }

  @Patch(':id/finalizar')
  @RequirePermissions('PRESTAMOS_DOCENTES_ACTUALIZAR')
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.finish(id, usuario?.id);
  }
}
