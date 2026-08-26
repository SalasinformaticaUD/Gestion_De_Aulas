import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MODULOS } from '../auth/auth.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CredencialesService } from './credenciales.service';
import { CreateCredencialeDto } from './dto/create-credenciale.dto';
import {
  CambiarEstadoCredencialDto,
  CrearAccesoCredencialDto,
  FindCredencialesDto,
} from './dto/credenciales.dto';
import { UpdateCredencialeDto } from './dto/update-credenciale.dto';
@RequireAuth()
@RequireModule(MODULOS.CREDENCIALES)
@Controller('credenciales')
export class CredencialesController {
  constructor(private service: CredencialesService) {}
  @Post() @RequirePermissions('CREDENCIALES_CREAR') create(
    @Body() dto: CreateCredencialeDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.create(dto, u.id);
  }
  @Get() @RequirePermissions('CREDENCIALES_LEER') findAll(
    @Query() dto: FindCredencialesDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.findAll(dto, u.id);
  }
  @Get(':id/secreto') @RequirePermissions('CREDENCIALES_VER_SECRETO') secreto(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.revelar(id, u.id);
  }
  @Post(':id/accesos') @RequirePermissions('CREDENCIALES_ACTUALIZAR') acceso(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearAccesoCredencialDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.crearAcceso(id, dto, u.id);
  }
  @Patch(':id/estado') @RequirePermissions('CREDENCIALES_ACTUALIZAR') estado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoCredencialDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.cambiarEstado(id, dto, u.id);
  }
  @Get(':id') @RequirePermissions('CREDENCIALES_LEER') one(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.findOne(id, u.id);
  }
  @Patch(':id') @RequirePermissions('CREDENCIALES_ACTUALIZAR') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCredencialeDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.update(id, dto, u.id);
  }
}
