import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';

@Injectable()
export class DocentesService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly auditoria?: AuditoriaService) {}
  async create(dto: CreateDocenteDto, usuarioId?: string) { const docente = await this.prisma.docente.create({ data: dto }); await this.auditoria?.registrar({ usuarioId, entidad: 'Docente', entidadId: docente.id, accion: 'CREATE', datosNuevos: docente }); return docente; }
  findAll(query?: string) { return this.prisma.docente.findMany({ where: query ? { OR: [{ nombre: { contains: query, mode: 'insensitive' } }, { documento: { contains: query, mode: 'insensitive' } }, { correo: { contains: query, mode: 'insensitive' } }] } : undefined, orderBy: { nombre: 'asc' } }); }
  async findOne(id: string) { const docente = await this.prisma.docente.findUnique({ where: { id } }); if (!docente) throw new NotFoundException('Docente no encontrado.'); return docente; }
  async update(id: string, dto: UpdateDocenteDto, usuarioId?: string) { const previo = await this.findOne(id); const docente = await this.prisma.docente.update({ where: { id }, data: dto }); await this.auditoria?.registrar({ usuarioId, entidad: 'Docente', entidadId: id, accion: 'UPDATE', datosPrevios: previo, datosNuevos: docente }); return docente; }
}
