import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultarReporteDto } from './dto/consultar-reporte.dto';

export const REPORTES = [
  'uso-aulas',
  'practicas-libres',
  'prestamos-audiovisuales',
  'asistencia-docente',
  'multas',
  'limpieza',
] as const;
export type CodigoReporte = (typeof REPORTES)[number];

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(reporte: CodigoReporte, query: ConsultarReporteDto) {
    const { desde, hasta, pagina, limite, skip } = this.contexto(query);
    const porFecha = { gte: desde, lte: hasta };
    let total: number;
    let items: Record<string, unknown>[];

    switch (reporte) {
      case 'practicas-libres': {
        const where = { inicio: porFecha };
        [total, items] = await Promise.all([
          this.prisma.practicaLibre.count({ where }),
          this.prisma.practicaLibre
            .findMany({
              where,
              skip,
              take: limite,
              orderBy: { inicio: 'desc' },
              include: {
                aula: { select: { codigo: true, ubicacion: true } },
                estudiante: { select: { codigo: true, nombre: true } },
              },
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                inicio: r.inicio,
                finEstimada: r.finEstimada,
                finReal: r.finReal,
                estado: r.estado,
                aula: (r.aula as unknown as { codigo: string }).codigo,
                ubicacion: (r.aula as unknown as { ubicacion: string })
                  .ubicacion,
                estudiante: r.estudiante.nombre,
                codigoEstudiante: r.estudiante.codigo,
              })),
            ),
        ]);
        break;
      }
      case 'prestamos-audiovisuales': {
        const where = { salidaEn: porFecha };
        [total, items] = await Promise.all([
          this.prisma.prestamoAudiovisual.count({ where }),
          this.prisma.prestamoAudiovisual
            .findMany({
              where,
              skip,
              take: limite,
              orderBy: { salidaEn: 'desc' },
              include: {
                aula: { select: { codigo: true } },
                docente: { select: { nombre: true } },
                detalles: {
                  include: {
                    equipo: {
                      select: { codigoInventario: true, nombre: true },
                    },
                  },
                },
              },
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                salidaEn: r.salidaEn,
                devolucionEstimada: r.devolucionEstimada,
                devolucionReal: r.devolucionReal,
                estado: r.estado,
                aula: r.aula.codigo,
                docente: r.docente.nombre,
                equipos: r.detalles
                  .map(
                    (d) => `${d.equipo.codigoInventario} — ${d.equipo.nombre}`,
                  )
                  .join('; '),
              })),
            ),
        ]);
        break;
      }
      case 'asistencia-docente': {
        const where = { fecha: porFecha };
        [total, items] = await Promise.all([
          this.prisma.asistenciaDocente.count({ where }),
          this.prisma.asistenciaDocente
            .findMany({
              where,
              skip,
              take: limite,
              orderBy: { fecha: 'desc' },
              include: {
                clase: {
                  include: {
                    aula: { select: { codigo: true } },
                    docente: { select: { nombre: true } },
                    asignatura: { select: { nombre: true } },
                  },
                },
              },
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                fecha: r.fecha,
                estado: r.estado,
                registradaEn: r.registradaEn,
                observacion: r.observacion,
                aula: r.clase.aula.codigo,
                docente: r.clase.docente.nombre,
                asignatura: r.clase.asignatura.nombre,
              })),
            ),
        ]);
        break;
      }
      case 'multas': {
        const where = { fecha: porFecha };
        [total, items] = await Promise.all([
          this.prisma.multa.count({ where }),
          this.prisma.multa
            .findMany({
              where,
              skip,
              take: limite,
              orderBy: { fecha: 'desc' },
              include: {
                estudiante: { select: { codigo: true, nombre: true } },
                motivo: { select: { nombre: true } },
              },
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                fecha: r.fecha,
                estado: r.estado,
                estudiante: r.estudiante.nombre,
                codigoEstudiante: r.estudiante.codigo,
                motivo: r.motivo.nombre,
                descripcion: r.descripcion,
                cumplidaEn: r.cumplidaEn,
                anuladaEn: r.anuladaEn,
              })),
            ),
        ]);
        break;
      }
      case 'limpieza': {
        const where = { realizadaEn: porFecha };
        [total, items] = await Promise.all([
          this.prisma.limpieza.count({ where }),
          this.prisma.limpieza
            .findMany({
              where,
              skip,
              take: limite,
              orderBy: { realizadaEn: 'desc' },
              include: {
                aula: { select: { codigo: true, ubicacion: true } },
                responsable: { select: { nombreCompleto: true } },
              },
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                realizadaEn: r.realizadaEn,
                aula: (r.aula as unknown as { codigo: string }).codigo,
                ubicacion: (r.aula as unknown as { ubicacion: string })
                  .ubicacion,
                responsable:
                  (r.responsable as { nombreCompleto?: string } | null)
                    ?.nombreCompleto ?? null,
                observacion: r.observacion,
              })),
            ),
        ]);
        break;
      }
      case 'uso-aulas': {
        const [practicas, prestamos] = await Promise.all([
          this.prisma.practicaLibre.findMany({
            where: { inicio: porFecha },
            include: { aula: { select: { codigo: true, ubicacion: true } } },
          }),
          this.prisma.prestamoDocente.findMany({
            where: { inicio: porFecha },
            include: { aula: { select: { codigo: true, ubicacion: true } } },
          }),
        ]);
        const resumen = new Map<
          string,
          {
            aula: string;
            ubicacion: string;
            practicasLibres: number;
            prestamosDocentes: number;
            ocupaciones: number;
          }
        >();
        for (const registro of practicas) {
          const actual = resumen.get(registro.aulaId) ?? {
            aula: registro.aula.codigo,
            ubicacion: registro.aula.ubicacion,
            practicasLibres: 0,
            prestamosDocentes: 0,
            ocupaciones: 0,
          };
          actual.practicasLibres++;
          actual.ocupaciones++;
          resumen.set(registro.aulaId, actual);
        }
        for (const registro of prestamos) {
          const actual = resumen.get(registro.aulaId) ?? {
            aula: registro.aula.codigo,
            ubicacion: registro.aula.ubicacion,
            practicasLibres: 0,
            prestamosDocentes: 0,
            ocupaciones: 0,
          };
          actual.prestamosDocentes++;
          actual.ocupaciones++;
          resumen.set(registro.aulaId, actual);
        }
        total = resumen.size;
        items = [...resumen.values()]
          .sort((a, b) => b.ocupaciones - a.ocupaciones)
          .slice(skip, skip + limite);
        break;
      }
    }
    return {
      reporte,
      desde,
      hasta,
      pagina,
      limite,
      total: total!,
      items: items!,
    };
  }

  aCsv(resultado: { items: Record<string, unknown>[] }) {
    const columnas = [...new Set(resultado.items.flatMap(Object.keys))];
    const escapar = (valor: unknown) => {
      const texto =
        valor === null || valor === undefined
          ? ''
          : valor instanceof Date
            ? valor.toISOString()
            : typeof valor === 'object'
              ? JSON.stringify(valor)
              : typeof valor === 'string'
                ? valor
                : typeof valor === 'number' || typeof valor === 'boolean'
                  ? `${valor}`
                  : typeof valor === 'bigint'
                    ? valor.toString()
                    : typeof valor === 'symbol'
                      ? (valor.description ?? '')
                      : '[función]';
      return `"${texto.replaceAll('"', '""')}"`;
    };
    return [
      columnas.join(','),
      ...resultado.items.map((item) =>
        columnas.map((columna) => escapar(item[columna])).join(','),
      ),
    ].join('\n');
  }

  private contexto(query: ConsultarReporteDto) {
    const hasta = query.hasta
      ? new Date(`${query.hasta}T23:59:59.999Z`)
      : new Date();
    const desde = query.desde
      ? new Date(`${query.desde}T00:00:00.000Z`)
      : new Date(hasta.getTime() - 30 * 86400000);
    if (
      Number.isNaN(desde.getTime()) ||
      Number.isNaN(hasta.getTime()) ||
      desde > hasta
    )
      throw new BadRequestException('El rango de fechas no es válido.');
    if (hasta.getTime() - desde.getTime() > 366 * 86400000)
      throw new BadRequestException(
        'El rango máximo permitido es de 366 días.',
      );
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 50;
    return { desde, hasta, pagina, limite, skip: (pagina - 1) * limite };
  }
}
