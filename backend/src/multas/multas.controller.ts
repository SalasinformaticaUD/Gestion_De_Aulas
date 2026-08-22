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
  findAll(
    @Query('estado') estado?: string,
    @Query('estudianteId') estudianteId?: string,
    @Query('codigo') codigo?: string,
  ) {
    return this.multasService.findAll({ estado, estudianteId, codigo });
  }

  @Get('motivos')
  findAllMotivos() {
    return this.multasService.findAllMotivos();
  }

  @Post('motivos')
  createMotivo(@Body() createMotivoMultaDto: unknown) {
    return this.multasService.createMotivo(createMotivoMultaDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.multasService.findOne(id);
  }

  @Patch(':id/cumplir')
  cumplir(@Param('id', ParseUUIDPipe) id: string) {
    return this.multasService.cumplir(id);
  }

  @Patch(':id/anular')
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMultaDto: UpdateMultaDto,
  ) {
    return this.multasService.anular(id, updateMultaDto);
  }
}
