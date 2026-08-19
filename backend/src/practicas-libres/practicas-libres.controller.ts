import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PracticasLibresService } from './practicas-libres.service';
import { CreatePracticasLibreDto } from './dto/create-practicas-libre.dto';
import { UpdatePracticasLibreDto } from './dto/update-practicas-libre.dto';

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
  findAll() {
    return this.practicasLibresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practicasLibresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePracticasLibreDto: UpdatePracticasLibreDto,
  ) {
    return this.practicasLibresService.update(id, updatePracticasLibreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practicasLibresService.remove(id);
  }
}
