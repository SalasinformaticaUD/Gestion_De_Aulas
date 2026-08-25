import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MODULOS } from '../auth/auth.constants';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CancelarPrestamoAudiovisualDto } from './dto/cancelar-prestamo-audiovisual.dto';
import { CreateEquipoAudiovisualDto } from './dto/create-equipo-audiovisual.dto';
import { CreatePrestamoAudiovisualDto } from './dto/create-prestamo-audiovisual.dto';
import { DevolverPrestamoAudiovisualDto } from './dto/devolver-prestamo-audiovisual.dto';
import { FindEquiposAudiovisualesDto } from './dto/find-equipos-audiovisuales.dto';
import { FindPrestamosAudiovisualesDto } from './dto/find-prestamos-audiovisuales.dto';
import { UpdateEquipoAudiovisualDto } from './dto/update-equipo-audiovisual.dto';
import { PrestamosAudiovisualesService } from './prestamos-audiovisuales.service';

@RequireModule(MODULOS.AUDIOVISUALES)
@Controller('prestamos-audiovisuales')
export class PrestamosAudiovisualesController {
  constructor(
    private readonly prestamosAudiovisualesService: PrestamosAudiovisualesService,
  ) {}

  @Get('equipos')
  @RequirePermissions('AUDIOVISUALES_LEER')
  findEquipos(@Query() filters: FindEquiposAudiovisualesDto) {
    return this.prestamosAudiovisualesService.findEquipos(filters);
  }

  @Post('equipos')
  @RequirePermissions('AUDIOVISUALES_CREAR')
  createEquipo(
    @Body() dto: CreateEquipoAudiovisualDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosAudiovisualesService.createEquipo(dto, usuario?.id);
  }

  @Get('equipos/:id')
  @RequirePermissions('AUDIOVISUALES_LEER')
  findEquipo(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosAudiovisualesService.findEquipo(id);
  }

  @Patch('equipos/:id')
  @RequirePermissions('AUDIOVISUALES_ACTUALIZAR')
  updateEquipo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipoAudiovisualDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosAudiovisualesService.updateEquipo(
      id,
      dto,
      usuario?.id,
    );
  }

  @Post()
  @RequirePermissions('AUDIOVISUALES_CREAR')
  create(
    @Body() dto: CreatePrestamoAudiovisualDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosAudiovisualesService.create(dto, usuario?.id);
  }

  @Get()
  @RequirePermissions('AUDIOVISUALES_LEER')
  findAll(@Query() filters: FindPrestamosAudiovisualesDto) {
    return this.prestamosAudiovisualesService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('AUDIOVISUALES_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosAudiovisualesService.findOne(id);
  }

  @Patch(':id/devolver')
  @RequirePermissions('AUDIOVISUALES_ACTUALIZAR')
  devolver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevolverPrestamoAudiovisualDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosAudiovisualesService.devolver(id, dto, usuario?.id);
  }

  @Patch(':id/cancelar')
  @RequirePermissions('AUDIOVISUALES_APROBAR')
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarPrestamoAudiovisualDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.prestamosAudiovisualesService.cancelar(id, dto, usuario?.id);
  }
}
