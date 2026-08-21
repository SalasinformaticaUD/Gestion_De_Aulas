import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule('ADMINISTRACION')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('ADMINISTRACION_CREAR')
  create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.rolesService.create(createRoleDto, usuario?.id);
  }

  @Get()
  @RequirePermissions('ADMINISTRACION_LEER')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('ADMINISTRACION_LEER')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ADMINISTRACION_ACTUALIZAR')
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.rolesService.update(id, updateRoleDto, usuario?.id);
  }

  @Delete(':id')
  @RequirePermissions('ADMINISTRACION_ELIMINAR')
  remove(@Param('id') id: string, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.rolesService.remove(id, usuario?.id);
  }
}
