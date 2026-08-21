import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Injectable()
export class DependenciasService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreateDependenciaDto, usuarioId?: string) {
    const dependencia = await this.prisma.dependencia.create({ data: dto });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Dependencia',
      entidadId: dependencia.id,
      accion: 'CREATE',
      datosNuevos: dependencia,
    });
    return dependencia;
  }

  findAll() {
    return this.prisma.dependencia.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const dependencia = await this.prisma.dependencia.findUnique({
      where: { id },
    });
    if (!dependencia) throw new NotFoundException('Dependencia no encontrada.');
    return dependencia;
  }

  async update(id: string, dto: UpdateDependenciaDto, usuarioId?: string) {
    const previa = await this.findOne(id);
    const dependencia = await this.prisma.dependencia.update({
      where: { id },
      data: dto,
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Dependencia',
      entidadId: id,
      accion: 'UPDATE',
      datosPrevios: previa,
      datosNuevos: dependencia,
    });
    return dependencia;
  }

  async remove(id: string, usuarioId?: string) {
    const usuarios = await this.prisma.usuario.count({
      where: { dependenciaId: id },
    });
    if (usuarios > 0) {
      throw new ConflictException(
        'No se puede eliminar una dependencia con usuarios asociados.',
      );
    }
    try {
      const dependencia = await this.prisma.dependencia.delete({
        where: { id },
      });
      await this.auditoria?.registrar({
        usuarioId,
        entidad: 'Dependencia',
        entidadId: id,
        accion: 'DELETE',
        datosPrevios: dependencia,
      });
      return dependencia;
    } catch {
      throw new NotFoundException('Dependencia no encontrada.');
    }
  }
}
