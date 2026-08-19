import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LimpiezaAulasService } from './limpieza-aulas.service';
import { CreateLimpiezaAulaDto } from './dto/create-limpieza-aula.dto';
import { UpdateLimpiezaAulaDto } from './dto/update-limpieza-aula.dto';

@Controller('limpieza-aulas')
export class LimpiezaAulasController {
  constructor(private readonly limpiezaAulasService: LimpiezaAulasService) {}

  @Post()
  create(@Body() createLimpiezaAulaDto: CreateLimpiezaAulaDto) {
    return this.limpiezaAulasService.create(createLimpiezaAulaDto);
  }

  @Get()
  findAll() {
    return this.limpiezaAulasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.limpiezaAulasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLimpiezaAulaDto: UpdateLimpiezaAulaDto,
  ) {
    return this.limpiezaAulasService.update(id, updateLimpiezaAulaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.limpiezaAulasService.remove(id);
  }
}
