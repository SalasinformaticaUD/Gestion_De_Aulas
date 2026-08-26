import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MODULOS } from '../auth/auth.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { TareasOperativasService } from './tareas-operativas.service';
import { CreateTareasOperativaDto } from './dto/create-tareas-operativa.dto';
import { UpdateTareasOperativaDto } from './dto/update-tareas-operativa.dto';
import { CambiarEstadoTareaDto, FindTareasDto } from './dto/tareas.dto';

@RequireModule(MODULOS.TAREAS)
@Controller('tareas-operativas')
export class TareasOperativasController {
  constructor(
    private readonly tareasOperativasService: TareasOperativasService,
  ) {}

  @Post()
  @RequirePermissions('TAREAS_CREAR')
  create(
    @Body() createTareasOperativaDto: CreateTareasOperativaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.tareasOperativasService.create(
      createTareasOperativaDto,
      usuario?.id,
    );
  }

  @Get()
  @RequirePermissions('TAREAS_LEER')
  findAll(@Query() dto: FindTareasDto) {
    return this.tareasOperativasService.findAll(dto);
  }

  @Get(':id')
  @RequirePermissions('TAREAS_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tareasOperativasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('TAREAS_ACTUALIZAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTareasOperativaDto: UpdateTareasOperativaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.tareasOperativasService.update(
      id,
      updateTareasOperativaDto,
      usuario?.id,
    );
  }

  @Patch(':id/estado')
  @RequirePermissions('TAREAS_ACTUALIZAR')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoTareaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.tareasOperativasService.cambiarEstado(
      id,
      dto.estado,
      usuario?.id,
      usuario?.roles.includes('ADMINISTRADOR') ?? false,
    );
  }
}
