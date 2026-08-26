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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CreateLimpiezaAulaDto } from './dto/create-limpieza-aula.dto';
import {
  ConsultarIndicadoresLimpiezaDto,
  ConsultarMatrizLimpiezaDto,
  ConsultarSugerenciasLimpiezaDto,
  FindLimpiezaAulasDto,
} from './dto/find-limpieza-aulas.dto';
import { UpdateLimpiezaAulaDto } from './dto/update-limpieza-aula.dto';
import { LimpiezaAulasService } from './limpieza-aulas.service';

@RequireModule(MODULOS.LIMPIEZA)
@Controller('limpieza-aulas')
export class LimpiezaAulasController {
  constructor(private readonly limpiezaAulasService: LimpiezaAulasService) {}

  @Post()
  @RequirePermissions('LIMPIEZA_CREAR')
  create(
    @Body() dto: CreateLimpiezaAulaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.limpiezaAulasService.create(dto, usuario?.id);
  }

  @Get()
  @RequirePermissions('LIMPIEZA_LEER')
  findAll(@Query() filters: FindLimpiezaAulasDto) {
    return this.limpiezaAulasService.findAll(filters);
  }

  @Get('sugerencias')
  @RequirePermissions('LIMPIEZA_LEER')
  findSugerencias(@Query() query: ConsultarSugerenciasLimpiezaDto) {
    return this.limpiezaAulasService.findSugerencias(query);
  }

  @Get('matriz')
  @RequirePermissions('LIMPIEZA_LEER')
  findMatriz(@Query() query: ConsultarMatrizLimpiezaDto) {
    return this.limpiezaAulasService.findMatriz(query);
  }

  @Get('indicadores')
  @RequirePermissions('LIMPIEZA_LEER')
  findIndicadores(@Query() query: ConsultarIndicadoresLimpiezaDto) {
    return this.limpiezaAulasService.findIndicadores(query);
  }

  @Get(':id')
  @RequirePermissions('LIMPIEZA_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.limpiezaAulasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('LIMPIEZA_ACTUALIZAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLimpiezaAulaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.limpiezaAulasService.update(id, dto, usuario?.id);
  }
}
