import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreateRoleDto, usuarioId?: string) {
    const { permisoIds = [], ...data } = dto;
    const rol = await this.prisma.rol.create({
      data: {
        ...data,
        permisos: { create: permisoIds.map((permisoId) => ({ permisoId })) },
      },
      include: {
        permisos: { include: { permiso: { include: { modulo: true } } } },
      },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Rol',
      entidadId: rol.id,
      accion: 'CREATE',
      datosNuevos: rol,
    });
    return rol;
  }

  findAll() {
    return this.prisma.rol.findMany({
      include: {
        permisos: { include: { permiso: { include: { modulo: true } } } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const rol = await this.prisma.rol.findUnique({
      where: { id },
      include: {
        permisos: { include: { permiso: { include: { modulo: true } } } },
      },
    });
    if (!rol) throw new NotFoundException('Rol no encontrado.');
    return rol;
  }

  async update(id: string, dto: UpdateRoleDto, usuarioId?: string) {
    const previo = await this.findOne(id);
    const { permisoIds, ...data } = dto;
    const rol = await this.prisma.rol.update({
      where: { id },
      data: {
        ...data,
        ...(permisoIds === undefined
          ? {}
          : {
              permisos: {
                deleteMany: {},
                create: permisoIds.map((permisoId) => ({ permisoId })),
              },
            }),
      },
      include: {
        permisos: { include: { permiso: { include: { modulo: true } } } },
      },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Rol',
      entidadId: id,
      accion: 'UPDATE',
      datosPrevios: previo,
      datosNuevos: rol,
    });
    return rol;
  }

  async remove(id: string, usuarioId?: string) {
    const previo = await this.findOne(id);
    const rol = await this.prisma.rol.delete({ where: { id } });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Rol',
      entidadId: id,
      accion: 'DELETE',
      datosPrevios: previo,
    });
    return rol;
  }
}
