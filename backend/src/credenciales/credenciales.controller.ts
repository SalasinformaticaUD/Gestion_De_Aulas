import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Delete,
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
  ConsultarSecretoCredencialDto,
  ActualizarRolesCredencialDto,
  CrearAccesoCredencialDto,
  FindCredencialesDto,
  GuardarSecretoCredencialDto,
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
  @Post('verificar-acceso') @RequirePermissions('CREDENCIALES_LEER') verificarAcceso(
    @Body() dto: ConsultarSecretoCredencialDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.verificarAcceso(u.id, dto.contrasena);
  }
  @Get(':id/secreto') @RequirePermissions('CREDENCIALES_VER_SECRETO') secreto(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.revelar(id, u.id);
  }
  @Post(':id/secreto') @RequirePermissions('CREDENCIALES_VER_SECRETO') guardarSecreto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarSecretoCredencialDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.guardarSecreto(id, dto, u.id);
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
  @Put(':id/roles') @RequirePermissions('CREDENCIALES_ACTUALIZAR') roles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarRolesCredencialDto,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.actualizarRoles(id, dto.rolIds, u.id);
  }
  @Delete(':id') @RequirePermissions('CREDENCIALES_ELIMINAR') remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() u: UsuarioAutenticado,
  ) {
    return this.service.remove(id, u.id);
  }
}
