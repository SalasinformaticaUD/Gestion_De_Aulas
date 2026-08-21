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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CreatePrestamosDocenteDto } from './dto/create-prestamos-docente.dto';
import { FindPrestamosDocentesDto } from './dto/find-prestamos-docentes.dto';

@RequireModule(MODULOS.PRESTAMOS_DOCENTES)
@Controller('prestamos-docentes')
export class PrestamosDocentesController {
  constructor(
    private readonly prestamosDocentesService: PrestamosDocentesService,
  ) {}

  @Post()
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
  findAll(@Query() filters: FindPrestamosDocentesDto) {
    return this.prestamosDocentesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosDocentesService.findOne(id);
  }

  @Patch(':id/aprobar')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.approve(id, usuario?.id);
  }

  @Patch(':id/cancelar')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.cancel(id, usuario?.id);
  }

  @Patch(':id/finalizar')
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosDocentesService.finish(id, usuario?.id);
  }
}
