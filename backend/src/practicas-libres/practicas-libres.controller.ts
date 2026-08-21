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
import { CreatePracticasLibreDto } from './dto/create-practicas-libre.dto';
import { FinalizarPracticaLibreDto } from './dto/finalizar-practica-libre.dto';
import { FindPracticasLibresDto } from './dto/find-practicas-libres.dto';

@Controller('practicas-libres')
export class PracticasLibresController {
  constructor(
    private readonly practicasLibresService: PracticasLibresService,
  ) {}

  @Post()
  create(@Body() createPracticasLibreDto: CreatePracticasLibreDto) {
    return this.practicasLibresService.create(createPracticasLibreDto);
  }

  @Get()
  findAll(@Query() filters: FindPracticasLibresDto) {
    return this.practicasLibresService.findAll(filters);
  }

  @Get('estudiantes/:codigo')
  findStudent(@Param('codigo') codigo: string) {
    return this.practicasLibresService.findStudent(codigo);
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
