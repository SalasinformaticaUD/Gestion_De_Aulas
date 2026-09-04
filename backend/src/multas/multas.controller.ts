import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MODULOS } from '../auth/auth.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { MultasService } from './multas.service';
import { CreateMultaDto } from './dto/create-multa.dto';
import { CreateMotivoMultaDto } from './dto/create-motivo-multa.dto';
import { CumplirMultaDto } from './dto/cumplir-multa.dto';
import { AnularMultaDto } from './dto/anular-multa.dto';
import { UpdateMultaDto } from './dto/update-multa.dto';

@RequireModule(MODULOS.MULTAS)
@Controller('multas')
export class MultasController {
  constructor(private readonly multasService: MultasService) {}

  @Post()
  @RequirePermissions('MULTAS_CREAR')
  create(
    @Body() createMultaDto: CreateMultaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.multasService.create(createMultaDto, usuario?.id);
  }

  @Get()
  @RequirePermissions('MULTAS_LEER')
  findAll(
    @Query('estado') estado?: string,
    @Query('estudianteId') estudianteId?: string,
    @Query('codigo') codigo?: string,
  ) {
    return this.multasService.findAll({ estado, estudianteId, codigo });
  }

  @Get('motivos')
  @RequirePermissions('MULTAS_LEER')
  findAllMotivos() {
    return this.multasService.findAllMotivos();
  }

  @Post('busqueda-masiva')
  @RequirePermissions('MULTAS_LEER')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }))
  buscarMasivo(@UploadedFile() archivo: { buffer: Buffer; originalname: string } | undefined) {
    return this.multasService.buscarMasivo(archivo);
  }

  @Post('cargar-excel')
  @RequirePermissions('MULTAS_CREAR')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }))
  cargarExcel(
    @UploadedFile() archivo: { buffer: Buffer; originalname: string } | undefined,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.multasService.cargarExcel(archivo, usuario?.id);
  }

  @Get('estudiantes/:codigo/practica-activa')
  @RequirePermissions('MULTAS_LEER')
  buscarEstudianteConPracticaActiva(@Param('codigo') codigo: string) {
    return this.multasService.buscarEstudianteConPracticaActiva(codigo);
  }

  @Post('motivos')
  @RequirePermissions('MULTAS_CREAR')
  createMotivo(
    @Body() createMotivoMultaDto: CreateMotivoMultaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.multasService.createMotivo(createMotivoMultaDto, usuario?.id);
  }

  @Get(':id')
  @RequirePermissions('MULTAS_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.multasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('MULTAS_ACTUALIZAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMultaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.multasService.update(id, dto, usuario?.id);
  }

  @Patch(':id/cumplir')
  @RequirePermissions('MULTAS_ACTUALIZAR')
  cumplir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CumplirMultaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.multasService.cumplir(id, dto, usuario?.id);
  }

  @Patch(':id/anular')
  @RequirePermissions('MULTAS_ACTUALIZAR')
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnularMultaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.multasService.anular(id, dto, usuario?.id);
  }
}
