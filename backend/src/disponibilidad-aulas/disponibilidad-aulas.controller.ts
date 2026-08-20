import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';

@Controller('disponibilidad-aulas')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class DisponibilidadAulasController {
  constructor(
    private readonly disponibilidadAulasService: DisponibilidadAulasService,
  ) {}

  @Get()
  findAll(@Query() query: ConsultarDisponibilidadDto) {
    return this.disponibilidadAulasService.findAll(query);
  }

  @Get(':aulaId')
  findOne(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Query() query: ConsultarDisponibilidadDto,
  ) {
    return this.disponibilidadAulasService.findOne(aulaId, query);
  }
}
