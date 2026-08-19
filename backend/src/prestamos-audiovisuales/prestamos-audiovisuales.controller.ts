import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PrestamosAudiovisualesService } from './prestamos-audiovisuales.service';
import { CreatePrestamosAudiovisualeDto } from './dto/create-prestamos-audiovisuale.dto';
import { UpdatePrestamosAudiovisualeDto } from './dto/update-prestamos-audiovisuale.dto';

@Controller('prestamos-audiovisuales')
export class PrestamosAudiovisualesController {
  constructor(
    private readonly prestamosAudiovisualesService: PrestamosAudiovisualesService,
  ) {}

  @Post()
  create(
    @Body() createPrestamosAudiovisualeDto: CreatePrestamosAudiovisualeDto,
  ) {
    return this.prestamosAudiovisualesService.create(
      createPrestamosAudiovisualeDto,
    );
  }

  @Get()
  findAll() {
    return this.prestamosAudiovisualesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosAudiovisualesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamosAudiovisualeDto: UpdatePrestamosAudiovisualeDto,
  ) {
    return this.prestamosAudiovisualesService.update(
      id,
      updatePrestamosAudiovisualeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosAudiovisualesService.remove(id);
  }
}
