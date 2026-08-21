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
import { CreateAsistenciaDocenteDto } from './dto/create-asistencia-docente.dto';
import { UpdateAsistenciaDocenteDto } from './dto/update-asistencia-docente.dto';
import { FindAsistenciasDto } from './dto/find-asistencias.dto';

@Controller('asistencia-docente')
export class AsistenciaDocenteController {
  constructor(
    private readonly asistenciaDocenteService: AsistenciaDocenteService,
  ) {}

  @Post()
  create(@Body() createAsistenciaDocenteDto: CreateAsistenciaDocenteDto) {
    return this.asistenciaDocenteService.create(createAsistenciaDocenteDto);
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
