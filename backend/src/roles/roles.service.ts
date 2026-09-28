import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MonitoresClientService } from '../integraciones/monitores-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type PerfilMonitores = 'ADMIN' | 'LIDER' | null;
type DependenciaMonitores = 'PHYSICS' | 'INFORMATICS_LABS' | 'ELECTRICAL' | null;

const includeRol = {
  permisos: { include: { permiso: { include: { modulo: true } } } },
} as const;

const selectUsuarioMonitores = {
  id: true,
  nombreCompleto: true,
  nombreUsuario: true,
  correo: true,
  estado: true,
  roles: { include: { rol: true } },
} as const;

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
    @Optional() private readonly monitores?: MonitoresClientService,
  ) {}

  async create(dto: CreateRoleDto, usuarioId?: string) {
    const { permisoIds = [], perfilMonitores = null, dependenciaMonitores = null, ...data } = dto;
    await this.validarConfiguracionMonitores(perfilMonitores, dependenciaMonitores, permisoIds);
    const rol = await this.prisma.rol.create({
      data: {
        ...data,
        perfilMonitores,
        dependenciaMonitores: perfilMonitores === 'LIDER' ? dependenciaMonitores : null,
        permisos: { create: permisoIds.map((permisoId) => ({ permisoId })) },
      },
      include: includeRol,
    });
    await this.auditoria?.registrar({ usuarioId, entidad: 'Rol', entidadId: rol.id, accion: 'CREATE', datosNuevos: rol });
    return rol;
  }

  findAll() {
    return this.prisma.rol.findMany({ include: includeRol, orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const rol = await this.prisma.rol.findUnique({ where: { id }, include: includeRol });
    if (!rol) throw new NotFoundException('Rol no encontrado.');
    return rol;
  }

  async update(id: string, dto: UpdateRoleDto, usuarioId?: string) {
    const previo = await this.findOne(id);
    const { permisoIds, perfilMonitores, dependenciaMonitores, ...data } = dto;
    const siguientePerfil = perfilMonitores === undefined ? previo.perfilMonitores : perfilMonitores;
    const siguienteDependencia = dependenciaMonitores === undefined
      ? (perfilMonitores === undefined || perfilMonitores === 'LIDER' ? previo.dependenciaMonitores : null)
      : dependenciaMonitores;
    const siguientesPermisos = permisoIds ?? previo.permisos.map(({ permisoId }) => permisoId);
    await this.validarConfiguracionMonitores(siguientePerfil, siguienteDependencia, siguientesPermisos);
    const rol = await this.prisma.rol.update({
      where: { id },
      data: {
        ...data,
        ...(perfilMonitores === undefined ? {} : { perfilMonitores }),
        ...(dependenciaMonitores === undefined && siguientePerfil === 'LIDER'
          ? {}
          : { dependenciaMonitores: siguientePerfil === 'LIDER' ? siguienteDependencia : null }),
        ...(permisoIds === undefined ? {} : {
          permisos: { deleteMany: {}, create: permisoIds.map((permisoId) => ({ permisoId })) },
        }),
      },
      include: includeRol,
    });
    await this.sincronizarUsuariosDelRol(id, Boolean(previo.perfilMonitores || rol.perfilMonitores));
    await this.auditoria?.registrar({ usuarioId, entidad: 'Rol', entidadId: id, accion: 'UPDATE', datosPrevios: previo, datosNuevos: rol });
    return rol;
  }

  async remove(id: string, usuarioId?: string) {
    const previo = await this.findOne(id);
    const usuarioIds = await this.prisma.usuarioRol.findMany({ where: { rolId: id }, select: { usuarioId: true } });
    const rol = await this.prisma.rol.delete({ where: { id } });
    await this.sincronizarUsuarios(usuarioIds.map(({ usuarioId: idUsuario }) => idUsuario), Boolean(previo.perfilMonitores));
    await this.auditoria?.registrar({ usuarioId, entidad: 'Rol', entidadId: id, accion: 'DELETE', datosPrevios: previo });
    return rol;
  }

  private async validarConfiguracionMonitores(
    perfil: PerfilMonitores,
    dependencia: DependenciaMonitores,
    permisoIds: string[],
  ) {
    if (!perfil) {
      if (dependencia) throw new BadRequestException('La dependencia de Monitores requiere un perfil de Monitores.');
      return;
    }
    if (perfil === 'LIDER' && !dependencia) throw new BadRequestException('Un líder de Monitores debe tener una dependencia.');
    if (perfil === 'ADMIN' && dependencia) throw new BadRequestException('Un administrador de Monitores no debe tener dependencia.');
    const permiso = await this.prisma.permiso.findFirst({ where: { id: { in: permisoIds }, codigo: 'MONITORES_LEER' }, select: { id: true } });
    if (!permiso) throw new BadRequestException('Un cargo con acceso a Monitores debe incluir el permiso MONITORES_LEER.');
  }

  private async sincronizarUsuariosDelRol(rolId: string, sincronizar: boolean) {
    if (!sincronizar) return;
    const usuarios = await this.prisma.usuario.findMany({ where: { roles: { some: { rolId } } }, select: selectUsuarioMonitores });
    await Promise.all(usuarios.map((usuario) => this.sincronizarUsuarioMonitores(usuario)));
  }

  private async sincronizarUsuarios(ids: string[], sincronizar: boolean) {
    if (!sincronizar || !ids.length) return;
    const usuarios = await this.prisma.usuario.findMany({ where: { id: { in: ids } }, select: selectUsuarioMonitores });
    await Promise.all(usuarios.map((usuario) => this.sincronizarUsuarioMonitores(usuario)));
  }

  private async sincronizarUsuarioMonitores(usuario: {
    id: string; nombreCompleto: string; nombreUsuario: string; correo: string; estado: EstadoCuenta;
    roles: Array<{ rol: { perfilMonitores: PerfilMonitores; dependenciaMonitores: DependenciaMonitores } }>;
  }) {
    if (!this.monitores) throw new BadRequestException('La integración de Monitores no está disponible.');
    const perfil = usuario.roles.map(({ rol }) => rol).find((rol) => rol.perfilMonitores);
    await this.monitores.sincronizarUsuario({
      externalUserId: usuario.id,
      username: usuario.nombreUsuario,
      email: usuario.correo,
      fullName: usuario.nombreCompleto,
      role: perfil?.perfilMonitores ?? null,
      department: perfil?.dependenciaMonitores ?? undefined,
      isActive: usuario.estado === EstadoCuenta.ACTIVA && Boolean(perfil),
    });
  }
}
