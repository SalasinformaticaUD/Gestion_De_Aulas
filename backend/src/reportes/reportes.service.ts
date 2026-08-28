import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultarReporteDto } from './dto/consultar-reporte.dto';
import { PlantillasPdfService } from './plantillas-pdf.service';
import type { UsuarioAutenticado } from '../auth/auth.types';

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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly plantillasPdf?: PlantillasPdfService,
  ) {}

  async generarPracticaLibrePdf(
    id: string,
    usuario?: Pick<UsuarioAutenticado, 'nombreUsuario'>,
  ): Promise<Buffer> {
    const practica = await this.prisma.practicaLibre.findUnique({
      where: { id },
      include: {
        estudiante: true,
        aula: { include: { proyectoCurricular: true } },
      },
    });
    if (!practica) {
      throw new NotFoundException('No existe la práctica libre indicada.');
    }

    const fecha = this.partesBogota(practica.inicio);
    const consecutivo = `PRA-${fecha.fecha.replaceAll('-', '')}-${id
      .slice(0, 8)
      .toUpperCase()}`;
    const estado = String(practica.estado);
    const observaciones = [
      `Estado: ${estado}`,
      practica.finReal
        ? `Finalizada: ${this.horaBogota(practica.finReal)}`
        : `Fin estimado: ${this.horaBogota(practica.finEstimada)}`,
      'Registro generado desde el Sistema de Gestión Operativa de Aulas de Software.',
    ].join(' ');
    const atendidoPor = usuario?.nombreUsuario || 'admin';

    return this.pdf().generar(
      'Ficha - Practicas libres',
      {
        B10: `NOMBRE:\n${practica.estudiante.nombre}`,
        G10: `CÉDULA/CÓDIGO:\n${practica.estudiante.codigo}`,
        B12: 'TÍTULO DE LA PRÁCTICA O ESPACIO ACADÉMICO: Práctica Libre',
        G12: 'CÓDIGO DE GRUPO: No Aplica',
        B16: fecha.dia,
        C16: fecha.mes,
        D16: fecha.anio,
        E16: this.horaBogota(practica.inicio),
        F16: `${practica.aula.codigo} - ${practica.aula.ubicacion}`,
        I16: consecutivo,
        // La fila 19 contiene los encabezados ENTREGA/DEVOL; los datos van
        // en la primera fila de registros, la fila 20.
        B20: '1',
        C20: `Uso de aula ${practica.aula.codigo} para práctica libre`,
        H20: id.slice(0, 8).toUpperCase(),
        I20: this.horaBogota(practica.inicio),
        J20: this.horaBogota(practica.finEstimada),
        B25: `OBSERVACIONES: ${observaciones}`,
        B26: `ATENDIDO POR: ${atendidoPor}`,
        G26: `USUARIO:\n${practica.estudiante.nombre}`,
        G28: 'DOCENTE: No Aplica',
      },
      `Ficha_PracticaLibre_${consecutivo}`,
    );
  }

  async generarPrestamoAudiovisualPdf(id: string): Promise<Buffer> {
    const prestamo = await this.prisma.prestamoAudiovisual.findUnique({
      where: { id },
      include: {
        docente: true,
        aula: { include: { proyectoCurricular: true } },
        entregadoPor: {
          select: { nombreCompleto: true, nombreUsuario: true },
        },
        detalles: { include: { equipo: true } },
      },
    });
    if (!prestamo) {
      throw new NotFoundException('No existe el préstamo audiovisual indicado.');
    }

    const salida = prestamo.salidaEn ?? prestamo.devolucionEstimada;
    const fecha = this.partesBogota(salida);
    const equipos = prestamo.detalles.map((detalle) => detalle.equipo);
    const responsable =
      prestamo.entregadoPor?.nombreCompleto ??
      prestamo.entregadoPor?.nombreUsuario ??
      'Sistema';
    const observaciones = [
      ...equipos.map((equipo) =>
        [
          equipo.codigoInventario,
          equipo.nombre,
          equipo.observacion ? `Observación: ${equipo.observacion}` : '',
        ]
          .filter(Boolean)
          .join(' - '),
      ),
      prestamo.motivoCancelacion
        ? `Motivo de cancelación: ${prestamo.motivoCancelacion}`
        : '',
      `Estado: ${prestamo.estado}`,
      `Atendido por: ${responsable}`,
    ]
      .filter(Boolean)
      .join('. ');
    const nombreArchivo =
      equipos.map((equipo) => equipo.codigoInventario).join('-') ||
      `Prestamo-${id.slice(0, 8)}`;

    return this.pdf().generar(
      'Ficha SIGUD audiovisuales',
      {
        D6: fecha.dia,
        E6: fecha.mes,
        F6: fecha.anio,
        C8: equipos.map((equipo) => equipo.codigoInventario).join(', '),
        F8: [...new Set(equipos.map((equipo) => equipo.tipo))].join(', '),
        C9: equipos.map((equipo) => equipo.nombre).join(', '),
        C10: 'No aplica',
        C11: prestamo.aula.proyectoCurricular?.nombre ?? 'No aplica',
        C13: prestamo.aula.codigo,
        C14: this.horaBogota(salida),
        C15: this.horaBogota(prestamo.devolucionEstimada),
        C17: observaciones,
        C21: responsable,
      },
      `${nombreArchivo}-${prestamo.aula.codigo}`,
    );
  }

  async generarAsistenciaSigudPdf(fechaTexto: string): Promise<Buffer> {
    this.validarFechaDiaria(fechaTexto);
    const fecha = new Date(`${fechaTexto}T00:00:00.000Z`);
    const inicioDia = fecha;
    const finDia = new Date(`${fechaTexto}T23:59:59.999Z`);
    const asistencias = await this.prisma.asistenciaDocente.findMany({
      where: {
        fecha,
        estado: 'ASISTIO',
        clase: {
          periodo: {
            fechaInicio: { lte: finDia },
            fechaFin: { gte: inicioDia },
          },
        },
      },
      include: {
        clase: {
          include: { aula: true, docente: true },
        },
      },
    });

    const valores: Record<string, string> = {
      F8: fechaTexto.slice(8, 10),
      H8: fechaTexto.slice(5, 7),
      J8: fechaTexto.slice(0, 4),
    };
    const filasPorSala = new Map<string, number>();
    for (let index = 0; index < 20; index++) {
      const filaSala = 11 + index * 3;
      filasPorSala.set(String(306 + index), filaSala);
    }
    // La plantilla conserva su catálogo de salas; se sobreescribe con los códigos
    // que realmente existen en cada bloque para que el mapeo no dependa del orden.
    const salasPlantilla = [
      '306', '312', '311', '406', '412', '501', '502', '503', '504', '505',
      '506', '507', '601', '701', '702', '703', '704', '706', '707', '403',
    ];
    filasPorSala.clear();
    salasPlantilla.forEach((sala, index) => filasPorSala.set(sala, 11 + index * 3));

    const columnasPorHora: Record<number, string> = {
      6: 'G',
      8: 'J',
      10: 'M',
      12: 'P',
      14: 'S',
      16: 'V',
      18: 'Y',
      20: 'AB',
    };
    const nombres = new Map<string, string[]>();
    for (const asistencia of asistencias) {
      const clase = asistencia.clase;
      const sala = this.extraerNumero(clase.aula.codigo);
      const fila = filasPorSala.get(sala);
      const hora = clase.horaInicio.getUTCHours();
      const columna = columnasPorHora[hora];
      if (!fila || !columna) continue;
      const clave = `${fila}:${columna}`;
      const lista = nombres.get(clave) ?? [];
      if (!lista.includes(clase.docente.nombre)) lista.push(clase.docente.nombre);
      nombres.set(clave, lista);
    }
    for (const [clave, lista] of nombres) {
      const [fila, columna] = clave.split(':');
      valores[`${columna}${Number(fila) + 1}`] = lista.join(' / ');
      valores[`${columna}${Number(fila) + 2}`] = lista.join(' / ');
    }

    return this.pdf().generar(
      'SIGUD',
      valores,
      `Asistencia_SIGUD_${fechaTexto.replaceAll('-', '_')}`,
    );
  }

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

  private pdf(): PlantillasPdfService {
    if (!this.plantillasPdf) {
      throw new ServiceUnavailableException(
        'La generación de PDFs no está disponible en este despliegue.',
      );
    }
    return this.plantillasPdf;
  }

  private validarFechaDiaria(fechaTexto: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
      throw new BadRequestException('fecha debe tener formato YYYY-MM-DD.');
    }
    const fecha = new Date(`${fechaTexto}T00:00:00.000Z`);
    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha indicada no es válida.');
    }
    if (fecha.getUTCDay() === 0 || this.esFestivo(fechaTexto)) {
      throw new BadRequestException(
        'No se genera asistencia SIGUD para domingos ni días festivos.',
      );
    }
  }

  private esFestivo(fecha: string): boolean {
    const festivos = new Set([
      '01-01', '01-12', '03-23', '04-02', '04-03', '05-01', '05-18',
      '06-08', '06-15', '06-29', '07-13', '07-20', '08-07', '08-17',
      '10-12', '11-02', '11-16', '12-08', '12-25',
    ]);
    const festivos2027 = new Set([
      '01-01', '01-11', '03-22', '03-25', '03-26', '05-01', '05-10',
      '05-31', '06-07', '07-05', '07-12', '07-20', '08-07', '08-16',
      '10-18', '11-01', '11-15', '12-08', '12-25',
    ]);
    const [anio, mesDia] = [fecha.slice(0, 4), fecha.slice(5)];
    return (anio === '2027' ? festivos2027 : festivos).has(mesDia);
  }

  private partesBogota(fecha: Date) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(fecha);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    return {
      fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
      dia: valor('day'),
      mes: valor('month'),
      anio: valor('year'),
    };
  }

  private horaBogota(fecha: Date | null): string {
    if (!fecha) return '';
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
  }

  private extraerNumero(valor: string): string {
    const resultado = valor.match(/(\d+)\s*$/);
    return resultado?.[1] ?? valor.trim();
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
