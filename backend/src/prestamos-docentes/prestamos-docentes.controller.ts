import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PrestamosDocentesService } from './prestamos-docentes.service';
import { CreatePrestamosDocenteDto } from './dto/create-prestamos-docente.dto';
import { UpdatePrestamosDocenteDto } from './dto/update-prestamos-docente.dto';

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
  findAll() {
    return this.prestamosDocentesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosDocentesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamosDocenteDto: UpdatePrestamosDocenteDto,
  ) {
    return this.prestamosDocentesService.update(id, updatePrestamosDocenteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosDocentesService.remove(id);
  }
}
