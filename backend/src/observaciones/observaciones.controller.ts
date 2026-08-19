import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';

@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Post()
  create(@Body() createObservacioneDto: CreateObservacioneDto) {
    return this.observacionesService.create(createObservacioneDto);
  }

  @Get()
  findAll() {
    return this.observacionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.observacionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateObservacioneDto: UpdateObservacioneDto,
  ) {
    return this.observacionesService.update(id, updateObservacioneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.observacionesService.remove(id);
  }
}
