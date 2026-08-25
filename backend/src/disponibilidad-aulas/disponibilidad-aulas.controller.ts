import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';
import { ConsultarResumenDiaDto } from './dto/consultar-resumen-dia.dto';
import { ConsultarHistorialDisponibilidadDto } from './dto/consultar-historial-disponibilidad.dto';

@RequireModule(MODULOS.DISPONIBILIDAD_AULAS)
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

  @Get('sugerencias')
  findSugerencias(@Query() query: ConsultarDisponibilidadDto) {
    return this.disponibilidadAulasService.findSugerencias(query);
  }

  @Get('historial')
  findHistorial(@Query() query: ConsultarHistorialDisponibilidadDto) {
    return this.disponibilidadAulasService.findHistorial(query);
  }

  @Get(':aulaId')
  findOne(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Query() query: ConsultarDisponibilidadDto,
  ) {
    return this.disponibilidadAulasService.findOne(aulaId, query);
  }
}
