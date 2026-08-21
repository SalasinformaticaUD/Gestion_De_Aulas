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
import { AsistenciaDocenteService } from './asistencia-docente.service';
import { MODULOS } from '../auth/auth.constants';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { CreateAsistenciaDocenteDto } from './dto/create-asistencia-docente.dto';
import { UpdateAsistenciaDocenteDto } from './dto/update-asistencia-docente.dto';
import { FindAsistenciasDto } from './dto/find-asistencias.dto';

@RequireModule(MODULOS.ASISTENCIA_DOCENTE)
@Controller('asistencia-docente')
export class AsistenciaDocenteController {
  constructor(
    private readonly asistenciaDocenteService: AsistenciaDocenteService,
  ) {}

  @Post()
  @RequireAuth()
  create(
    @Body() createAsistenciaDocenteDto: CreateAsistenciaDocenteDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.asistenciaDocenteService.create(
      createAsistenciaDocenteDto,
      usuario.id,
    );
  }

  @Get()
  findAll(@Query() filters: FindAsistenciasDto) {
    return this.asistenciaDocenteService.findAll(filters);
  }

  @Get('clase/:claseId')
  findByClass(@Param('claseId', ParseUUIDPipe) claseId: string) {
    return this.asistenciaDocenteService.findByClass(claseId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAsistenciaDocenteDto: UpdateAsistenciaDocenteDto,
  ) {
    return this.asistenciaDocenteService.update(id, updateAsistenciaDocenteDto);
  }
}
