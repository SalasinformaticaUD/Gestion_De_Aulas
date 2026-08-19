import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrestamosAudiovisualesService } from './prestamos-audiovisuales.service';
import { CreatePrestamoAudiovisualDto } from './dto/create-prestamo-audiovisual.dto';

@Controller('prestamos-audiovisuales')
export class PrestamosAudiovisualesController {
  constructor(
    private readonly prestamosAudiovisualesService: PrestamosAudiovisualesService,
  ) {}

  @Post()
  create(@Body() createPrestamoAudiovisualDto: CreatePrestamoAudiovisualDto) {
    return this.prestamosAudiovisualesService.create(
      createPrestamoAudiovisualDto,
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
}
