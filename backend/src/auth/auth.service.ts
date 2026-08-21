import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenService } from './auth-token.service';
import { UsuarioAutenticado } from './auth.types';
import { LoginDto } from './dto/login.dto';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHash: PasswordHashService,
    private readonly tokens: AuthTokenService,
  ) {}

  async login(dto: LoginDto) {
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

    const token = this.tokens.sign(usuario.id);
    return {
      ...token,
      tokenType: 'Bearer',
      usuario: this.toAuthenticatedUser(usuario),
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
      cargo: usuario.cargo,
      dependencia: usuario.dependencia,
      roles: [...new Set(roles)],
      permisos: [...permisos],
      modulos: [...modulos],
    };
  }
}
