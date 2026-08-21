import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreatePermisoDto, usuarioId?: string) {
    const permiso = await this.prisma.permiso.create({
      data: dto,
      include: { modulo: true },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Permiso',
      entidadId: permiso.id,
      accion: 'CREATE',
      datosNuevos: permiso,
    });
    return permiso;
  }

  findAll() {
    return this.prisma.permiso.findMany({
      include: { modulo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id },
      include: { modulo: true },
    });
    if (!permiso) throw new NotFoundException('Permiso no encontrado.');
    return permiso;
  }

  async update(id: string, dto: UpdatePermisoDto, usuarioId?: string) {
    const previo = await this.findOne(id);
    const permiso = await this.prisma.permiso.update({
      where: { id },
      data: dto,
      include: { modulo: true },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Permiso',
      entidadId: id,
      accion: 'UPDATE',
      datosPrevios: previo,
      datosNuevos: permiso,
    });
    return permiso;
  }

  async remove(id: string, usuarioId?: string) {
    const previo = await this.findOne(id);
    const permiso = await this.prisma.permiso.delete({ where: { id } });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Permiso',
      entidadId: id,
      accion: 'DELETE',
      datosPrevios: previo,
    });
    return permiso;
  }
}
