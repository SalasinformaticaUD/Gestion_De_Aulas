import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule('ADMINISTRACION')
@Controller('permisos')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Post()
  @RequirePermissions('ADMINISTRACION_CREAR')
  create(
    @Body() createPermisoDto: CreatePermisoDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.permisosService.create(createPermisoDto, usuario?.id);
  }

  @Get()
  @RequirePermissions('ADMINISTRACION_LEER')
  findAll() {
    return this.permisosService.findAll();
  }

  @Get(':id')
  @RequirePermissions('ADMINISTRACION_LEER')
  findOne(@Param('id') id: string) {
    return this.permisosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ADMINISTRACION_ACTUALIZAR')
  update(
    @Param('id') id: string,
    @Body() updatePermisoDto: UpdatePermisoDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.permisosService.update(id, updatePermisoDto, usuario?.id);
  }

  @Delete(':id')
  @RequirePermissions('ADMINISTRACION_ELIMINAR')
  remove(@Param('id') id: string, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.permisosService.remove(id, usuario?.id);
  }
}
