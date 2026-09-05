import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';
@Injectable()
export class EstudiantesService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly auditoria?: AuditoriaService) {}
  async create(dto: CreateEstudianteDto, usuarioId?: string) { const estudiante = await this.prisma.estudiante.create({ data: dto }); await this.auditoria?.registrar({ usuarioId, entidad: 'Estudiante', entidadId: estudiante.id, accion: 'CREATE', datosNuevos: estudiante }); return estudiante; }
  async findAll(query?: string, page?: number, limit?: number) { const where = query ? { OR: [{ codigo: { contains: query, mode: 'insensitive' as const } }, { nombre: { contains: query, mode: 'insensitive' as const } }, { correo: { contains: query, mode: 'insensitive' as const } }] } : undefined; if (!page) return this.prisma.estudiante.findMany({ where, orderBy: { codigo: 'asc' } }); const take = Math.min(Math.max(limit ?? 25, 1), 100); const [data, total] = await this.prisma.$transaction([this.prisma.estudiante.findMany({ where, orderBy: { codigo: 'asc' }, skip: (page - 1) * take, take }), this.prisma.estudiante.count({ where })]); return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } }; }
  async findOne(id: string) { const estudiante = await this.prisma.estudiante.findUnique({ where: { id } }); if (!estudiante) throw new NotFoundException('Estudiante no encontrado.'); return estudiante; }
  async update(id: string, dto: UpdateEstudianteDto, usuarioId?: string) { const previo = await this.findOne(id); const estudiante = await this.prisma.estudiante.update({ where: { id }, data: dto }); await this.auditoria?.registrar({ usuarioId, entidad: 'Estudiante', entidadId: id, accion: 'UPDATE', datosPrevios: previo, datosNuevos: estudiante }); return estudiante; }
  async remove(id: string, usuarioId?: string) { const previo = await this.prisma.estudiante.findUnique({ where: { id }, include: { _count: { select: { practicas: true, multas: true } } } }); if (!previo) throw new NotFoundException('Estudiante no encontrado.'); if (previo._count.practicas || previo._count.multas) throw new ConflictException('No se puede eliminar el estudiante porque tiene prácticas o multas asociadas.'); const estudiante = await this.prisma.estudiante.delete({ where: { id } }); await this.auditoria?.registrar({ usuarioId, entidad: 'Estudiante', entidadId: id, accion: 'DELETE', datosPrevios: previo }); return estudiante; }
  async importarExcel(archivo: { buffer: Buffer; originalname: string } | undefined, usuarioId?: string) {
    if (!archivo?.buffer?.length || !/\.(xlsx|xls)$/i.test(archivo.originalname)) throw new BadRequestException('Debe adjuntar un archivo Excel .xlsx o .xls.');
    let filas: Array<Record<string, unknown>>;
    try { const libro = XLSX.read(archivo.buffer, { type: 'buffer' }); const hoja = libro.Sheets[libro.SheetNames[0]]; filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' }); } catch { throw new BadRequestException('No fue posible leer el archivo Excel.'); }
    if (!filas.length) throw new BadRequestException('El Excel debe contener al menos un estudiante.');
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const valor = (fila: Record<string, unknown>, encabezado: string, conservarContenido = false) => { const clave = Object.keys(fila).find((item) => normalizar(item) === normalizar(encabezado)); const contenido = String(clave ? fila[clave] ?? '' : ''); return conservarContenido ? contenido : contenido.trim(); };
    const encabezados = Object.keys(filas[0]).map(normalizar); const faltantes = ['CODIGO', 'NOMBRE', 'CORREO'].filter((item) => !encabezados.includes(item));
    if (faltantes.length) throw new BadRequestException(`Faltan columnas requeridas: ${faltantes.join(', ')}.`);
    const codigos = new Set<string>(); const datos = filas.map((fila, indice) => { const codigo = valor(fila, 'CODIGO'); const nombre = valor(fila, 'NOMBRE', true); const correo = valor(fila, 'CORREO').toLowerCase(); if (!/^\d{3,50}$/.test(codigo)) throw new BadRequestException(`Fila ${indice + 2}: el código debe contener solo números.`); if (!nombre.trim()) throw new BadRequestException(`Fila ${indice + 2}: el nombre es obligatorio.`); if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestException(`Fila ${indice + 2}: el correo es obligatorio y debe ser válido.`); if (codigos.has(codigo)) throw new ConflictException(`Fila ${indice + 2}: código duplicado dentro del archivo.`); codigos.add(codigo); return { codigo, nombre, correo }; });
    const resultado = await this.prisma.$transaction(async (tx) => {
      let creados = 0; let actualizados = 0;
      for (const dato of datos) {
        const existe = await tx.estudiante.findUnique({ where: { codigo: dato.codigo }, select: { id: true } });
        await tx.estudiante.upsert({ where: { codigo: dato.codigo }, update: { nombre: dato.nombre, correo: dato.correo }, create: dato });
        existe ? actualizados++ : creados++;
      }
      const anteriores = await tx.estudiante.findMany({ where: { codigo: { notIn: datos.map((dato) => dato.codigo) } }, select: { id: true, _count: { select: { practicas: true, multas: true } } } });
      const eliminables = anteriores.filter((estudiante) => !estudiante._count.practicas && !estudiante._count.multas).map((estudiante) => estudiante.id);
      const eliminados = eliminables.length ? (await tx.estudiante.deleteMany({ where: { id: { in: eliminables } } })).count : 0;
      return { total: datos.length, creados, actualizados, eliminados, conservadosPorHistorial: anteriores.length - eliminados };
    }, { maxWait: 15_000, timeout: 120_000 });
    await this.auditoria?.registrar({ usuarioId, entidad: 'Estudiante', entidadId: 'importacion-masiva', accion: 'CREATE', datosNuevos: resultado }); return resultado;
  }
}
