import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { MonitoresClientService } from './monitores-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('integraciones/monitores')
export class IntegracionesController {
  constructor(
    private readonly monitores: MonitoresClientService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('previsualizacion-horario-aulas')
  @RequirePermissions('DASHBOARD_VER_HORARIO_MONITORES')
  previsualizacionHorarioAulas() {
    return this.monitores.previsualizacionHorarioAulas();
  }

  @Post('sesion')
  async prepararSesion(@CurrentUser() usuario: UsuarioAutenticado) {
    const cuenta = await this.prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: {
        id: true,
        nombreCompleto: true,
        nombreUsuario: true,
        correo: true,
        estado: true,
        perfilMonitores: true,
        dependenciaMonitores: true,
      },
    });
    if (!cuenta || !cuenta.perfilMonitores) {
      return { sincronizado: false };
    }
    await this.monitores.sincronizarUsuario({
      externalUserId: cuenta.id,
      username: cuenta.nombreUsuario,
      email: cuenta.correo,
      fullName: cuenta.nombreCompleto,
      role: cuenta.perfilMonitores,
      department: cuenta.dependenciaMonitores ?? undefined,
      isActive: cuenta.estado === EstadoCuenta.ACTIVA,
    });
    return { sincronizado: true };
  }

  @Get('estado')
  async estado(@CurrentUser() usuario: UsuarioAutenticado) {
    await this.exigirAccesoMonitores(usuario.id);
    return this.monitores.estado();
  }

  @Get('usuario/:usuarioExternoId')
  async usuario(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('usuarioExternoId', ParseUUIDPipe) usuarioExternoId: string,
  ) {
    await this.exigirAccesoMonitores(usuario.id);
    return this.monitores.buscarUsuario(usuarioExternoId);
  }

  private async exigirAccesoMonitores(usuarioId: string) {
    const cuenta = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { perfilMonitores: true, estado: true },
    });
    if (!cuenta?.perfilMonitores || cuenta.estado !== EstadoCuenta.ACTIVA) {
      throw new ForbiddenException(
        'Su usuario no tiene acceso a Gestión de Monitores.',
      );
    }
  }
}
