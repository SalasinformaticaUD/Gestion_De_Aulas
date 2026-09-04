import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';
import { FindObservacionesDto } from './dto/find-observaciones.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';

@RequireModule(MODULOS.OBSERVACIONES)
@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Post()
  create(@Body() createObservacioneDto: CreateObservacioneDto, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.observacionesService.create(createObservacioneDto, usuario?.id);
  }

  @Get()
  findAll(@Query() filters: FindObservacionesDto) {
    return this.observacionesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.observacionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateObservacioneDto: UpdateObservacioneDto,
  ) {
    return this.observacionesService.update(id, updateObservacioneDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.observacionesService.remove(id);
  }
}
