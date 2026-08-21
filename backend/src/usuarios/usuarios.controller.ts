import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { FindUsuariosDto } from './dto/find-usuarios.dto';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule('ADMINISTRACION')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @RequirePermissions('ADMINISTRACION_CREAR')
  create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.usuariosService.create(createUsuarioDto, usuario?.id);
  }

  @Get()
  @RequirePermissions('ADMINISTRACION_LEER')
  findAll(@Query() filters: FindUsuariosDto) {
    return this.usuariosService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('ADMINISTRACION_LEER')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ADMINISTRACION_ACTUALIZAR')
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto, usuario?.id);
  }

  @Delete(':id')
  @RequirePermissions('ADMINISTRACION_ELIMINAR')
  remove(@Param('id') id: string, @CurrentUser() usuario?: UsuarioAutenticado) {
    return this.usuariosService.remove(id, usuario?.id);
  }
}
