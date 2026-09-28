import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { MonitoresClientService } from './monitores-client.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('integraciones/monitores')
export class IntegracionesController {
  constructor(
    private readonly monitores: MonitoresClientService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sesion')
  @RequireModule('MONITORES')
  @RequirePermissions('MONITORES_LEER')
  async prepararSesion(@CurrentUser() usuario: UsuarioAutenticado) {
    const cuenta = await this.prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: {
        id: true,
        nombreCompleto: true,
        nombreUsuario: true,
        correo: true,
        estado: true,
        roles: { include: { rol: { select: { perfilMonitores: true, dependenciaMonitores: true } } } },
      },
    });
    const perfil = cuenta?.roles.map(({ rol }) => rol).find((rol) => rol.perfilMonitores);
    if (!cuenta || !perfil?.perfilMonitores) {
      return { sincronizado: false };
    }
    await this.monitores.sincronizarUsuario({
      externalUserId: cuenta.id,
      username: cuenta.nombreUsuario,
      email: cuenta.correo,
      fullName: cuenta.nombreCompleto,
      role: perfil.perfilMonitores,
      department: perfil.dependenciaMonitores ?? undefined,
      isActive: cuenta.estado === EstadoCuenta.ACTIVA,
    });
    return { sincronizado: true };
  }

  @Get('estado')
  @RequireModule('MONITORES')
  @RequirePermissions('MONITORES_LEER')
  estado() {
    return this.monitores.estado();
  }

  @Get('usuario/:usuarioExternoId')
  @RequireModule('MONITORES')
  @RequirePermissions('MONITORES_LEER')
  usuario(@Param('usuarioExternoId', ParseUUIDPipe) usuarioExternoId: string) {
    return this.monitores.buscarUsuario(usuarioExternoId);
  }
}
