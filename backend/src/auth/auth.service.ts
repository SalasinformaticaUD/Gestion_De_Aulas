import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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

  async verifyCurrentPassword(
    usuarioId: string,
    password: string,
  ): Promise<boolean> {
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

  async cambiarContrasena(
    usuarioId: string,
    contrasenaActual: string,
    nuevaContrasena: string,
  ) {
    if (!(await this.verifyCurrentPassword(usuarioId, contrasenaActual))) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { passwordHash: this.passwordHash.hash(nuevaContrasena) },
    });
    return { actualizado: true as const };
  }

  async actualizarFotoPerfil(usuarioId: string, fotoPerfil?: string | null) {
    const fotoValidada = this.validarFotoPerfil(fotoPerfil);
    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { fotoPerfil: fotoValidada },
      select: { fotoPerfil: true },
    });
    return usuario;
  }

  async autorizarEstadosRestringidosTarea(usuarioId: string, password: string) {
    if (!(await this.verifyCurrentPassword(usuarioId, password)))
      throw new UnauthorizedException(
        'La contraseña de la sesión no es válida.',
      );
    const expiraEn = Date.now() + 10 * 60 * 1000;
    this.autorizacionesEstadosTarea.set(usuarioId, expiraEn);
    return { autorizado: true, expiraEn };
  }

  exigirAutorizacionEstadosRestringidosTarea(usuarioId?: string) {
    const expiraEn = usuarioId
      ? this.autorizacionesEstadosTarea.get(usuarioId)
      : undefined;
    if (!usuarioId || !expiraEn || expiraEn <= Date.now()) {
      if (usuarioId) this.autorizacionesEstadosTarea.delete(usuarioId);
      throw new ForbiddenException(
        'Confirme la contraseña de la sesión para cambiar una tarea a este estado.',
      );
    }
  }

  private toAuthenticatedUser(usuario: {
    id: string;
    nombreCompleto: string;
    nombreUsuario: string;
    correo: string;
    fotoPerfil: string | null;
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
    const permisos = new Set<string>();
    const modulos = new Set<string>();
    for (const { rol } of usuario.roles) {
      for (const { permiso } of rol.permisos) {
        permisos.add(permiso.codigo);
        if (permiso.modulo.activo) modulos.add(permiso.modulo.codigo);
      }
    }

    return {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      fotoPerfil: usuario.fotoPerfil,
      cargo: usuario.cargo,
      dependencia: usuario.dependencia,
      roles: [...new Set(roles)],
      permisos: [...permisos],
      modulos: [...modulos],
    };
  }

  private validarFotoPerfil(fotoPerfil?: string | null): string | null {
    if (fotoPerfil == null) return null;
    const coincidencia = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(fotoPerfil);
    if (!coincidencia) {
      throw new BadRequestException('La foto debe ser una imagen PNG, JPG, WebP o GIF válida.');
    }
    const base64 = coincidencia[2];
    const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const bytes = (base64.length * 3) / 4 - relleno;
    if (bytes > 3 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 3 MB.');
    }
    return fotoPerfil;
  }
}
