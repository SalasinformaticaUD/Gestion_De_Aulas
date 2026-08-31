import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@Injectable()
export class CargosService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreateCargoDto, usuarioId?: string) {
    const cargo = await this.prisma.cargo.create({ data: dto });
    await this.auditoria?.registrar({ usuarioId, entidad: 'Cargo', entidadId: cargo.id, accion: 'CREATE', datosNuevos: cargo });
    return cargo;
  }

  findAll() {
    return this.prisma.cargo.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id } });
    if (!cargo) throw new NotFoundException('Cargo no encontrado.');
    return cargo;
  }

  async update(id: string, dto: UpdateCargoDto, usuarioId?: string) {
    const previo = await this.findOne(id);
    const cargo = await this.prisma.cargo.update({ where: { id }, data: dto });
    await this.auditoria?.registrar({ usuarioId, entidad: 'Cargo', entidadId: id, accion: 'UPDATE', datosPrevios: previo, datosNuevos: cargo });
    return cargo;
  }

  async remove(id: string, usuarioId?: string) {
    const previo = await this.findOne(id);
    const cargo = await this.prisma.cargo.delete({ where: { id } });
    await this.auditoria?.registrar({ usuarioId, entidad: 'Cargo', entidadId: id, accion: 'DELETE', datosPrevios: previo });
    return cargo;
  }
}
