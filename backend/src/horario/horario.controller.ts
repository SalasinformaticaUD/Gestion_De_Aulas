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
} from '@nestjs/common';
import { CreateClaseProgramadaDto } from './dto/create-clase-programada.dto';
import { CreatePeriodoAcademicoDto } from './dto/create-periodo-academico.dto';
import { FindClasesDto } from './dto/find-clases.dto';
import { UpdateClaseProgramadaDto } from './dto/update-clase-programada.dto';
import { UpdatePeriodoAcademicoDto } from './dto/update-periodo-academico.dto';
import { ImportarHorarioDto } from './dto/importar-horario.dto';
import { HorarioService } from './horario.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@RequireModule(MODULOS.HORARIOS)
@Controller('horario')
export class HorarioController {
  constructor(private readonly horarioService: HorarioService) {}

  @Get('periodos')
  findPeriodos() {
    return this.horarioService.findPeriodos();
  }

  @Post('periodos')
  createPeriodo(@Body() dto: CreatePeriodoAcademicoDto) {
    return this.horarioService.createPeriodo(dto);
  }

  @Get('periodos/:id')
  findPeriodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.findPeriodo(id);
  }

  @Patch('periodos/:id/activar')
  activarPeriodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.activarPeriodo(id);
  }

  @Patch('periodos/:id')
  updatePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePeriodoAcademicoDto,
  ) {
    return this.horarioService.updatePeriodo(id, dto);
  }

  @Delete('periodos/:id')
  removePeriodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.removePeriodo(id);
  }

  @Get('clases')
  findClases(@Query() filters: FindClasesDto) {
    return this.horarioService.findClases(filters);
  }

  @Post('clases')
  createClase(@Body() dto: CreateClaseProgramadaDto) {
    return this.horarioService.createClase(dto);
  }

  @Post('importar')
  importar(@Body() dto: ImportarHorarioDto) {
    return this.horarioService.importar(dto);
  }

  @Patch('clases/:id')
  updateClase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClaseProgramadaDto,
  ) {
    return this.horarioService.updateClase(id, dto);
  }

  @Delete('clases/:id')
  removeClase(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.removeClase(id);
  }
}
