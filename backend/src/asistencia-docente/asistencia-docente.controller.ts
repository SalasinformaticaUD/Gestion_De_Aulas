import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AsistenciaDocenteService } from './asistencia-docente.service';
import { CreateAsistenciaDocenteDto } from './dto/create-asistencia-docente.dto';
import { UpdateAsistenciaDocenteDto } from './dto/update-asistencia-docente.dto';

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
  findAll() {
    return this.asistenciaDocenteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.asistenciaDocenteService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAsistenciaDocenteDto: UpdateAsistenciaDocenteDto,
  ) {
    return this.asistenciaDocenteService.update(id, updateAsistenciaDocenteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.asistenciaDocenteService.remove(id);
  }
}
