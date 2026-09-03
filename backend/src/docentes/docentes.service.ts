import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';

@Injectable()
export class DocentesService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly auditoria?: AuditoriaService) {}
  async create(dto: CreateDocenteDto, usuarioId?: string) { const docente = await this.prisma.docente.create({ data: dto }); await this.auditoria?.registrar({ usuarioId, entidad: 'Docente', entidadId: docente.id, accion: 'CREATE', datosNuevos: docente }); return docente; }
  findAll(query?: string) { return this.prisma.docente.findMany({ where: query ? { OR: [{ nombre: { contains: query, mode: 'insensitive' } }, { documento: { contains: query, mode: 'insensitive' } }, { correo: { contains: query, mode: 'insensitive' } }, { proyecto: { contains: query, mode: 'insensitive' } }] } : undefined, orderBy: { nombre: 'asc' } }); }
  async findOne(id: string) { const docente = await this.prisma.docente.findUnique({ where: { id } }); if (!docente) throw new NotFoundException('Docente no encontrado.'); return docente; }
  async update(id: string, dto: UpdateDocenteDto, usuarioId?: string) { const previo = await this.findOne(id); const docente = await this.prisma.docente.update({ where: { id }, data: dto }); await this.auditoria?.registrar({ usuarioId, entidad: 'Docente', entidadId: id, accion: 'UPDATE', datosPrevios: previo, datosNuevos: docente }); return docente; }
  async remove(id: string, usuarioId?: string) { const previo = await this.prisma.docente.findUnique({ where: { id }, include: { _count: { select: { clases: true, prestamos: true, prestamosAudiovisuales: true } } } }); if (!previo) throw new NotFoundException('Docente no encontrado.'); if (previo._count.clases || previo._count.prestamos || previo._count.prestamosAudiovisuales) throw new ConflictException('No se puede eliminar el docente porque tiene clases o préstamos asociados.'); const docente = await this.prisma.docente.delete({ where: { id } }); await this.auditoria?.registrar({ usuarioId, entidad: 'Docente', entidadId: id, accion: 'DELETE', datosPrevios: previo }); return docente; }
  async importarExcel(archivo: { buffer: Buffer; originalname: string } | undefined, usuarioId?: string) {
    if (!archivo?.buffer?.length || !/\.(xlsx|xls)$/i.test(archivo.originalname)) throw new BadRequestException('Debe adjuntar un archivo Excel .xlsx o .xls.');
    let filas: Array<{ datos: Record<string, unknown>; filaExcel: number }>;
    try {
      const libro = XLSX.read(archivo.buffer, { type: 'buffer' }); const hoja = libro.Sheets[libro.SheetNames[0]];
      const rango = XLSX.utils.decode_range(hoja['!ref'] ?? 'A1');
      filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '', blankrows: true })
        .map((datos, indice) => ({ datos, filaExcel: rango.s.r + indice + 2 }))
        .filter(({ datos }) => Object.values(datos).some((valorCelda) => String(valorCelda).trim() !== ''));
    } catch { throw new BadRequestException('No fue posible leer el archivo Excel.'); }
    if (!filas.length) throw new BadRequestException('El Excel debe contener al menos un docente.');
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const valor = (fila: Record<string, unknown>, encabezado: string) => { const clave = Object.keys(fila).find((item) => normalizar(item) === encabezado); return String(clave ? fila[clave] ?? '' : '').trim(); };
    const encabezados = Object.keys(filas[0].datos).map(normalizar); const faltantes = ['ID', 'NOMBRE'].filter((item) => !encabezados.includes(item));
    if (faltantes.length) throw new BadRequestException(`Faltan columnas requeridas: ${faltantes.join(', ')}.`);
    const documentos = new Set<string>(); let omitidasDuplicadas = 0;
    const datos = filas.flatMap(({ datos: fila, filaExcel }) => {
      const documento = valor(fila, 'ID'); const nombre = valor(fila, 'NOMBRE');
      if (!/^\d{3,50}$/.test(documento)) throw new BadRequestException(`Fila ${filaExcel}: el ID debe contener solo números.`);
      if (!nombre || nombre.length > 160) throw new BadRequestException(`Fila ${filaExcel}: el nombre es obligatorio y no puede superar 160 caracteres.`);
      if (documentos.has(documento)) { omitidasDuplicadas++; return []; }
      documentos.add(documento); return [{ documento, nombre }];
    });
    const resultado = await this.prisma.$transaction(async (tx) => {
      let creados = 0; let actualizados = 0;
      for (const dato of datos) {
        const existe = await tx.docente.findUnique({ where: { documento: dato.documento }, select: { id: true } });
        await tx.docente.upsert({ where: { documento: dato.documento }, update: { nombre: dato.nombre }, create: dato });
        existe ? actualizados++ : creados++;
      }
      const anteriores = await tx.docente.findMany({ where: { OR: [{ documento: { notIn: datos.map((dato) => dato.documento) } }, { documento: null }] }, select: { id: true, _count: { select: { clases: true, prestamos: true, prestamosAudiovisuales: true, practicasLibres: true } } } });
      const eliminables = anteriores.filter((docente) => !docente._count.clases && !docente._count.prestamos && !docente._count.prestamosAudiovisuales && !docente._count.practicasLibres).map((docente) => docente.id);
      const eliminados = eliminables.length ? (await tx.docente.deleteMany({ where: { id: { in: eliminables } } })).count : 0;
      return { total: filas.length, procesados: datos.length, omitidasDuplicadas, creados, actualizados, eliminados, conservadosPorHistorial: anteriores.length - eliminados };
    }, { maxWait: 15_000, timeout: 120_000 });
    await this.auditoria?.registrar({ usuarioId, entidad: 'Docente', entidadId: 'importacion-masiva', accion: 'CREATE', datosNuevos: resultado });
    return resultado;
  }
}
