import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { PasswordHashService } from '../auth/password-hash.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { FindUsuariosDto } from './dto/find-usuarios.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const select = {
  id: true,
  nombreCompleto: true,
  nombreUsuario: true,
  correo: true,
  cargo: true,
  estado: true,
  creadoEn: true,
  actualizadoEn: true,
  dependencia: true,
  roles: { include: { rol: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHashService,
    @Optional() private readonly auditoria?: AuditoriaService,
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
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Usuario',
      entidadId: usuario.id,
      accion: 'CREATE',
      datosNuevos: usuario,
    });
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
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select,
    });
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
        ...(rolIds === undefined
          ? {}
          : {
              roles: {
                deleteMany: {},
                create: rolIds.map((rolId) => ({ rolId })),
              },
            }),
      },
      select,
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Usuario',
      entidadId: id,
      accion: 'UPDATE',
      datosPrevios: previo,
      datosNuevos: usuario,
    });
    return usuario;
  }

  async remove(id: string, usuarioId?: string) {
    const previo = await this.findOne(id);
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { estado: EstadoCuenta.INACTIVA },
      select,
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Usuario',
      entidadId: id,
      accion: 'DISABLE',
      datosPrevios: previo,
      datosNuevos: usuario,
    });
    return usuario;
  }
}
