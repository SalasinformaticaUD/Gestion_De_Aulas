import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';
import { CreateDisponibilidadAulaDto } from './dto/create-disponibilidad-aula.dto';
import { UpdateDisponibilidadAulaDto } from './dto/update-disponibilidad-aula.dto';

@Controller('disponibilidad-aulas')
export class DisponibilidadAulasController {
  constructor(
    private readonly disponibilidadAulasService: DisponibilidadAulasService,
  ) {}

  @Post()
  create(@Body() createDisponibilidadAulaDto: CreateDisponibilidadAulaDto) {
    return this.disponibilidadAulasService.create(createDisponibilidadAulaDto);
  }

  @Get()
  findAll() {
    return this.disponibilidadAulasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disponibilidadAulasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDisponibilidadAulaDto: UpdateDisponibilidadAulaDto,
  ) {
    return this.disponibilidadAulasService.update(
      id,
      updateDisponibilidadAulaDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.disponibilidadAulasService.remove(id);
  }
}
