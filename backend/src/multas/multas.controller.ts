import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MultasService } from './multas.service';
import { CreateMultaDto } from './dto/create-multa.dto';
import { UpdateMultaDto } from './dto/update-multa.dto';

@Controller('multas')
export class MultasController {
  constructor(private readonly multasService: MultasService) {}

  @Post()
  create(@Body() createMultaDto: CreateMultaDto) {
    return this.multasService.create(createMultaDto);
  }

  @Get()
  findAll() {
    return this.multasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.multasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMultaDto: UpdateMultaDto) {
    return this.multasService.update(id, updateMultaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.multasService.remove(id);
  }
}
