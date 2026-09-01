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
import { PracticasLibresService } from './practicas-libres.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { CreatePracticasLibreDto } from './dto/create-practicas-libre.dto';
import { FinalizarPracticaLibreDto } from './dto/finalizar-practica-libre.dto';
import { FindPracticasLibresDto } from './dto/find-practicas-libres.dto';
import { FindEstudianteParamDto } from './dto/find-estudiante-param.dto';
import { CreateEstudianteDto } from '../estudiantes/dto/create-estudiante.dto';
import { EstudiantesService } from '../estudiantes/estudiantes.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireAuth()
@RequireModule(MODULOS.PRACTICAS_LIBRES)
@Controller('practicas-libres')
export class PracticasLibresController {
  constructor(
    private readonly practicasLibresService: PracticasLibresService,
    private readonly estudiantesService: EstudiantesService,
  ) {}

  @Post()
  create(@Body() createPracticasLibreDto: CreatePracticasLibreDto) {
    return this.practicasLibresService.create(createPracticasLibreDto);
  }

  @Post('estudiantes')
  @RequirePermissions('ESTUDIANTES_CREAR')
  createStudent(
    @Body() dto: CreateEstudianteDto,
    @CurrentUser() user?: UsuarioAutenticado,
  ) {
    return this.estudiantesService.create(dto, user?.id);
  }

  @Get()
  findAll(@Query() filters: FindPracticasLibresDto) {
    return this.practicasLibresService.findAll(filters);
  }

  @Get('estudiantes/:codigo')
  findStudent(@Param() params: FindEstudianteParamDto) {
    return this.practicasLibresService.findStudent(params.codigo);
  }

  @Patch(':id/finalizar')
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizarPracticaLibreDto,
  ) {
    return this.practicasLibresService.finish(id, dto);
  }

  @Patch(':id/cancelar')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.practicasLibresService.cancel(id);
  }
}
