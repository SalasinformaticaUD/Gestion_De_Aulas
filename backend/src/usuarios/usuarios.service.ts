import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PasswordHashService } from '../auth/password-hash.service';
import { MonitoresClientService } from '../integraciones/monitores-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { FindUsuariosDto } from './dto/find-usuarios.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

type PerfilMonitores = 'ADMIN' | 'LIDER' | null;
type DependenciaMonitores = 'PHYSICS' | 'INFORMATICS_LABS' | 'ELECTRICAL' | null;

const select = {
  id: true, nombreCompleto: true, nombreUsuario: true, correo: true, cargo: true,
  estado: true, perfilMonitores: true, dependenciaMonitores: true,
  creadoEn: true, actualizadoEn: true, dependencia: true,
  roles: { include: { rol: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHashService,
    @Optional() private readonly auditoria?: AuditoriaService,
    @Optional() private readonly monitores?: MonitoresClientService,
  ) {}

  async create(dto: CreateUsuarioDto, usuarioId?: string) {
    const { password, rolIds = [], perfilMonitores = null, dependenciaMonitores = null, ...data } = dto;
    this.validarConfiguracionMonitores(perfilMonitores, dependenciaMonitores);
    const usuario = await this.prisma.usuario.create({
      data: {
        ...data,
        perfilMonitores,
        dependenciaMonitores: perfilMonitores === 'LIDER' ? dependenciaMonitores : null,
        passwordHash: this.passwords.hash(password),
        roles: { create: rolIds.map((rolId) => ({ rolId })) },
      },
      select,
    });
    await this.sincronizarMonitores(usuario);
    await this.auditoria?.registrar({ usuarioId, entidad: 'Usuario', entidadId: usuario.id, accion: 'CREATE', datosNuevos: usuario });
    return usuario;
  }

  findAll(filters: FindUsuariosDto) {
    return this.prisma.usuario.findMany({
      where: {
        estado: filters.estado,
        dependenciaId: filters.dependenciaId,
        ...(filters.rolId ? { roles: { some: { rolId: filters.rolId } } } : {}),
      },
      select,
      orderBy: { nombreCompleto: 'asc' },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto, usuarioId?: string) {
    const previo = await this.findOne(id);
    const { password, rolIds, perfilMonitores, dependenciaMonitores, ...data } = dto;
    const siguientePerfil = perfilMonitores === undefined ? previo.perfilMonitores : perfilMonitores;
    const siguienteDependencia = dependenciaMonitores === undefined
      ? (siguientePerfil === 'LIDER' ? previo.dependenciaMonitores : null)
      : dependenciaMonitores;
    this.validarConfiguracionMonitores(siguientePerfil, siguienteDependencia);
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...data,
        ...(perfilMonitores === undefined ? {} : { perfilMonitores }),
        ...(dependenciaMonitores === undefined && siguientePerfil === 'LIDER'
          ? {}
          : { dependenciaMonitores: siguientePerfil === 'LIDER' ? siguienteDependencia : null }),
        ...(password ? { passwordHash: this.passwords.hash(password) } : {}),
        ...(rolIds === undefined ? {} : {
          roles: { deleteMany: {}, create: rolIds.map((rolId) => ({ rolId })) },
        }),
      },
      select,
    });
    await this.sincronizarMonitores(usuario, Boolean(previo.perfilMonitores));
    await this.auditoria?.registrar({ usuarioId, entidad: 'Usuario', entidadId: id, accion: 'UPDATE', datosPrevios: previo, datosNuevos: usuario });
    return usuario;
  }

  async remove(id: string, usuarioId?: string) {
    const previo = await this.findOne(id);
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { estado: EstadoCuenta.INACTIVA },
      select,
    });
    await this.sincronizarMonitores(usuario, Boolean(previo.perfilMonitores));
    await this.auditoria?.registrar({ usuarioId, entidad: 'Usuario', entidadId: id, accion: 'DISABLE', datosPrevios: previo, datosNuevos: usuario });
    return usuario;
  }

  private validarConfiguracionMonitores(perfil: PerfilMonitores, dependencia: DependenciaMonitores) {
    if (!perfil) {
      if (dependencia) throw new BadRequestException('La dependencia de Monitores requiere habilitar el acceso del usuario.');
      return;
    }
    if (perfil === 'LIDER' && !dependencia) throw new BadRequestException('Un líder de Monitores debe tener una dependencia.');
    if (perfil === 'ADMIN' && dependencia) throw new BadRequestException('Un administrador de Monitores no debe tener dependencia.');
  }

  private async sincronizarMonitores(
    usuario: {
      id: string; nombreCompleto: string; nombreUsuario: string; correo: string; estado: EstadoCuenta;
      perfilMonitores: PerfilMonitores; dependenciaMonitores: DependenciaMonitores;
    },
    forzar = false,
  ) {
    if (!usuario.perfilMonitores && !forzar) return;
    if (!this.monitores) throw new BadRequestException('La integración de Monitores no está disponible.');
    await this.monitores.sincronizarUsuario({
      externalUserId: usuario.id,
      username: usuario.nombreUsuario,
      email: usuario.correo,
      fullName: usuario.nombreCompleto,
      role: usuario.perfilMonitores,
      department: usuario.dependenciaMonitores ?? undefined,
      isActive: usuario.estado === EstadoCuenta.ACTIVA && Boolean(usuario.perfilMonitores),
    });
  }
}
