import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DependenciasService } from './dependencias.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule('ADMINISTRACION')
@Controller('dependencias')
export class DependenciasController {
  constructor(private readonly dependenciasService: DependenciasService) {}

  @Post()
  @RequirePermissions('ADMINISTRACION_CREAR')
  create(
    @Body() createDependenciaDto: CreateDependenciaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.dependenciasService.create(createDependenciaDto, usuario?.id);
  }

  @Get()
  @RequirePermissions('ADMINISTRACION_LEER')
  findAll() {
    return this.dependenciasService.findAll();
  }

  @Get(':id')
  @RequirePermissions('ADMINISTRACION_LEER')
  findOne(@Param('id') id: string) {
    return this.dependenciasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ADMINISTRACION_ACTUALIZAR')
  update(
    @Param('id') id: string,
    @Body() updateDependenciaDto: UpdateDependenciaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.dependenciasService.update(
      id,
      updateDependenciaDto,
      usuario?.id,
    );
  }

  @Delete(':id')
  @RequirePermissions('ADMINISTRACION_ELIMINAR')
  remove(@Param('id') id: string, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.dependenciasService.remove(id, usuario?.id);
  }
}
