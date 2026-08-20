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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateClaseProgramadaDto } from './dto/create-clase-programada.dto';
import { CreatePeriodoAcademicoDto } from './dto/create-periodo-academico.dto';
import { FindClasesDto } from './dto/find-clases.dto';
import { UpdateClaseProgramadaDto } from './dto/update-clase-programada.dto';
import { HorarioService } from './horario.service';

@Controller('horario')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
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

  @Patch('periodos/:id/activar')
  activarPeriodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.activarPeriodo(id);
  }

  @Get('clases')
  findClases(@Query() filters: FindClasesDto) {
    return this.horarioService.findClases(filters);
  }

  @Post('clases')
  createClase(@Body() dto: CreateClaseProgramadaDto) {
    return this.horarioService.createClase(dto);
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
