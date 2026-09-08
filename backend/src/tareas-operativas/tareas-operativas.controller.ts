import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
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
import { CambiarEstadoTareaDto, CrearInformeSeguimientoDto, DecidirTareaDto, FindTareasDto } from './dto/tareas.dto';

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

  @Get('responsables')
  @RequirePermissions('TAREAS_LEER')
  responsables() {
    return this.tareasOperativasService.listarResponsables();
  }

  @Get('indicadores/resumen')
  @RequirePermissions('TAREAS_LEER')
  indicadores(@Query() dto: FindTareasDto) { return this.tareasOperativasService.indicadores(dto); }

  @Get(':id')
  @RequirePermissions('TAREAS_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tareasOperativasService.findOne(id);
  }

  @Get(':id/historial')
  @RequirePermissions('TAREAS_LEER')
  historial(@Param('id', ParseUUIDPipe) id: string) { return this.tareasOperativasService.historial(id); }

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

  @Delete(':id')
  @RequirePermissions('TAREAS_ELIMINAR')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.tareasOperativasService.remove(id, usuario?.id);
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
      dto.motivoCancelacion,
    );
  }

  @Post(':id/decision')
  @RequirePermissions('TAREAS_APROBAR')
  decidir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidirTareaDto, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.tareasOperativasService.decidir(id, dto.decision, usuario?.id, usuario?.roles.includes('ADMINISTRADOR') ?? false, dto.responsableIds);
  }

  @Post(':id/informes-seguimiento')
  @RequirePermissions('TAREAS_ACTUALIZAR')
  crearInforme(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CrearInformeSeguimientoDto, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.tareasOperativasService.crearInforme(id, dto, usuario?.id, usuario?.roles.includes('ADMINISTRADOR') ?? false);
  }
}
