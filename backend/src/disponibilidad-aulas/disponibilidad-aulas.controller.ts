import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';
import { ConsultarResumenDiaDto } from './dto/consultar-resumen-dia.dto';

@Controller('disponibilidad-aulas')
export class DisponibilidadAulasController {
  constructor(
    private readonly disponibilidadAulasService: DisponibilidadAulasService,
  ) {}

  @Get()
  findAll(@Query() query: ConsultarDisponibilidadDto) {
    return this.disponibilidadAulasService.findAll(query);
  }

  @Get('resumen-dia')
  findResumenDia(@Query() query: ConsultarResumenDiaDto) {
    return this.disponibilidadAulasService.findResumenDia(query);
  }

  @Get(':aulaId')
  findOne(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Query() query: ConsultarDisponibilidadDto,
  ) {
    return this.disponibilidadAulasService.findOne(aulaId, query);
  }
}
