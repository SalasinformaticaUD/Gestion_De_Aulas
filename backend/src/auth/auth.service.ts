import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenService } from './auth-token.service';
import { UsuarioAutenticado } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PasswordHashService } from './password-hash.service';

const usuarioAutenticadoInclude = {
  dependencia: { select: { id: true, nombre: true } },
  roles: {
    include: {
      rol: {
        include: {
          permisos: {
            include: {
              permiso: { include: { modulo: true } },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  private readonly autorizacionesEstadosTarea = new Map<string, number>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHash: PasswordHashService,
    private readonly tokens: AuthTokenService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identificador = dto.identificador.trim();
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { nombreUsuario: identificador },
          { correo: identificador.toLowerCase() },
        ],
      },
      include: usuarioAutenticadoInclude,
    });

    if (
      !usuario ||
      usuario.estado !== EstadoCuenta.ACTIVA ||
      !this.passwordHash.verify(dto.password, usuario.passwordHash)
    ) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const usuarioAutenticado = this.toAuthenticatedUser(usuario);
    const token = this.tokens.sign({
      sub: usuarioAutenticado.id,
      nombreUsuario: usuarioAutenticado.nombreUsuario,
      dependenciaId: usuarioAutenticado.dependencia?.id ?? null,
      roles: usuarioAutenticado.roles,
      permisos: usuarioAutenticado.permisos,
    });
    return {
      ...token,
      tokenType: 'Bearer',
      usuario: usuarioAutenticado,
      aplicaciones: {
        puedeAccederAulas: usuarioAutenticado.modulos.some(
          (codigo) => codigo !== 'MONITORES',
        ),
        puedeAccederMonitores: usuarioAutenticado.modulos.includes('MONITORES'),
        urlMonitores: process.env.MONITORES_API_URL?.trim() || null,
      },
    };
  }

  async findAuthenticatedUser(id: string): Promise<UsuarioAutenticado | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: usuarioAutenticadoInclude,
    });
    if (!usuario || usuario.estado !== EstadoCuenta.ACTIVA) return null;
    return this.toAuthenticatedUser(usuario);
  }

  async verifyCurrentPassword(usuarioId: string, password: string): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { estado: true, passwordHash: true },
    });
    return Boolean(
      usuario &&
        usuario.estado === EstadoCuenta.ACTIVA &&
        this.passwordHash.verify(password, usuario.passwordHash),
    );
  }

  async autorizarEstadosRestringidosTarea(usuarioId: string, password: string) {
    if (!(await this.verifyCurrentPassword(usuarioId, password)))
      throw new UnauthorizedException('La contraseña de la sesión no es válida.');
    const expiraEn = Date.now() + 10 * 60 * 1000;
    this.autorizacionesEstadosTarea.set(usuarioId, expiraEn);
    return { autorizado: true, expiraEn };
  }

  exigirAutorizacionEstadosRestringidosTarea(usuarioId?: string) {
    const expiraEn = usuarioId ? this.autorizacionesEstadosTarea.get(usuarioId) : undefined;
    if (!usuarioId || !expiraEn || expiraEn <= Date.now()) {
      if (usuarioId) this.autorizacionesEstadosTarea.delete(usuarioId);
      throw new ForbiddenException('Confirme la contraseña de la sesión para cambiar una tarea a este estado.');
    }
  }

  private toAuthenticatedUser(usuario: {
    id: string;
    nombreCompleto: string;
    nombreUsuario: string;
    correo: string;
    cargo: string | null;
    dependencia: { id: string; nombre: string } | null;
    roles: Array<{
      rol: {
        nombre: string;
        permisos: Array<{
          permiso: {
            codigo: string;
            modulo: { codigo: string; activo: boolean };
          };
        }>;
      };
    }>;
  }): UsuarioAutenticado {
    const roles = usuario.roles.map(({ rol }) => rol.nombre);
    const esMonitor = roles.some(
      (rol) => rol.trim().toUpperCase() === 'MONITOR',
    );
    const permisos = new Set<string>();
    const modulos = new Set<string>();
    for (const { rol } of usuario.roles) {
      for (const { permiso } of rol.permisos) {
        if (esMonitor && permiso.modulo.codigo !== 'MONITORES') continue;
        permisos.add(permiso.codigo);
        if (permiso.modulo.activo) modulos.add(permiso.modulo.codigo);
      }
    }

    return {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      cargo: usuario.cargo,
      dependencia: usuario.dependencia,
      roles: [...new Set(roles)],
      permisos: [...permisos],
      modulos: [...modulos],
    };
  }
}
