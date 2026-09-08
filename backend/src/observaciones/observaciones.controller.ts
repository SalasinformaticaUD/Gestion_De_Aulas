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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@RequireModule(MODULOS.OBSERVACIONES)
@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Post()
  @RequirePermissions('OBSERVACIONES_CREAR')
  create(@Body() createObservacioneDto: CreateObservacioneDto, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.observacionesService.create(createObservacioneDto, usuario?.id);
  }

  @Get()
  @RequirePermissions('OBSERVACIONES_LEER')
  findAll(@Query() filters: FindObservacionesDto) {
    return this.observacionesService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('OBSERVACIONES_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.observacionesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('OBSERVACIONES_ACTUALIZAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateObservacioneDto: UpdateObservacioneDto,
  ) {
    return this.observacionesService.update(id, updateObservacioneDto);
  }

  @Delete(':id')
  @RequirePermissions('OBSERVACIONES_ELIMINAR')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.observacionesService.remove(id);
  }
}
