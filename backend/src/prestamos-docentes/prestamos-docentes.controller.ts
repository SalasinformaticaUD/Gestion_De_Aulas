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
import { PrestamosDocentesService } from './prestamos-docentes.service';
import { CreatePrestamosDocenteDto } from './dto/create-prestamos-docente.dto';
import { FindPrestamosDocentesDto } from './dto/find-prestamos-docentes.dto';

@Controller('prestamos-docentes')
export class PrestamosDocentesController {
  constructor(
    private readonly prestamosDocentesService: PrestamosDocentesService,
  ) {}

  @Post()
  create(@Body() createPrestamosDocenteDto: CreatePrestamosDocenteDto) {
    return this.prestamosDocentesService.create(createPrestamosDocenteDto);
  }

  @Get()
  findAll(@Query() filters: FindPrestamosDocentesDto) {
    return this.prestamosDocentesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosDocentesService.findOne(id);
  }

  @Patch(':id/aprobar')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosDocentesService.approve(id);
  }

  @Patch(':id/cancelar')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosDocentesService.cancel(id);
  }

  @Patch(':id/finalizar')
  finish(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosDocentesService.finish(id);
  }
}
