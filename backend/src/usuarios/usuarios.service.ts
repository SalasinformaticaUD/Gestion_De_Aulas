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
  estado: true, creadoEn: true, actualizadoEn: true, dependencia: true,
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
    const { password, rolIds = [], ...data } = dto;
    const usuario = await this.prisma.usuario.create({
      data: {
        ...data,
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
    const { password, rolIds, ...data } = dto;
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...data,
        ...(password ? { passwordHash: this.passwords.hash(password) } : {}),
        ...(rolIds === undefined ? {} : {
          roles: { deleteMany: {}, create: rolIds.map((rolId) => ({ rolId })) },
        }),
      },
      select,
    });
    await this.sincronizarMonitores(usuario, this.tienePerfilMonitores(previo));
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
    await this.sincronizarMonitores(usuario, this.tienePerfilMonitores(previo));
    await this.auditoria?.registrar({ usuarioId, entidad: 'Usuario', entidadId: id, accion: 'DISABLE', datosPrevios: previo, datosNuevos: usuario });
    return usuario;
  }

  private tienePerfilMonitores(usuario: { roles: Array<{ rol: { perfilMonitores: PerfilMonitores } }> }) {
    return usuario.roles.some(({ rol }) => Boolean(rol.perfilMonitores));
  }

  private async sincronizarMonitores(
    usuario: {
      id: string; nombreCompleto: string; nombreUsuario: string; correo: string; estado: EstadoCuenta;
      roles: Array<{ rol: { perfilMonitores: PerfilMonitores; dependenciaMonitores: DependenciaMonitores } }>;
    },
    forzar = false,
  ) {
    const perfil = usuario.roles.map(({ rol }) => rol).find((rol) => rol.perfilMonitores);
    if (!perfil && !forzar) return;
    if (!this.monitores) throw new BadRequestException('La integración de Monitores no está disponible.');
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