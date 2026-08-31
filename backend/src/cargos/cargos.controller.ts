import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@RequireModule('ADMINISTRACION')
@Controller('cargos')
export class CargosController {
  constructor(private readonly cargosService: CargosService) {}

  @Get()
  @RequirePermissions('ADMINISTRACION_LEER')
  findAll() { return this.cargosService.findAll(); }

  @Post()
  @RequirePermissions('ADMINISTRACION_CREAR')
  create(@Body() dto: CreateCargoDto, @CurrentUser() usuario?: UsuarioAutenticado) { return this.cargosService.create(dto, usuario?.id); }

  @Patch(':id')
  @RequirePermissions('ADMINISTRACION_ACTUALIZAR')
  update(@Param('id') id: string, @Body() dto: UpdateCargoDto, @CurrentUser() usuario?: UsuarioAutenticado) { return this.cargosService.update(id, dto, usuario?.id); }

  @Delete(':id')
  @RequirePermissions('ADMINISTRACION_ELIMINAR')
  remove(@Param('id') id: string, @CurrentUser() usuario?: UsuarioAutenticado) { return this.cargosService.remove(id, usuario?.id); }
}
