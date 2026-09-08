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
        B10: `NOMBRE:\n${practica.estudiante?.nombre ?? 'Docente responsable'}`,
        G10: `CÉDULA/CÓDIGO:\n${practica.estudiante?.codigo ?? 'No disponible'}`,
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
        G26: `USUARIO:\n${practica.estudiante?.nombre ?? 'Docente responsable'}`,
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
        C9: prestamo.docente?.nombre ?? 'No disponible',
        C10: 'No aplica',
        C11: prestamo.aula?.proyectoCurricular?.nombre ?? 'No aplica',
        C13: prestamo.aula?.codigo ?? prestamo.salonTexto,
        C14: this.horaBogota(salida),
        C15: this.horaBogota(prestamo.devolucionEstimada),
        C17: observaciones,
        C21: responsable,
      },
      `${nombreArchivo}-${prestamo.aula?.codigo ?? prestamo.salonTexto}`,
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

  async generarPracticasLibresMesPdf(mes: string, usuario?: Pick<UsuarioAutenticado, 'nombreUsuario'>): Promise<Buffer> {
    const rango = this.rangoMesCompleto(mes);
    const practicas = await this.prisma.practicaLibre.findMany({
      where: {
        inicio: { gte: rango.desde, lte: rango.hasta },
        estado: { in: ['DEVUELTO', 'CANCELADO'] },
      },
      select: { id: true },
      orderBy: { inicio: 'asc' },
    });
    if (!practicas.length) throw new BadRequestException('No hay prácticas libres para el mes seleccionado.');
    const archivos = await this.generarEnParalelo(practicas, async (practica) => ({
      nombre: `Ficha_PracticaLibre_${practica.id}.pdf`,
      contenido: await this.generarPracticaLibrePdf(practica.id, usuario),
    }));
    return this.comprimirPdfs(archivos);
  }

  async generarPrestamosAudiovisualesMesPdf(mes: string): Promise<Buffer> {
    const rango = this.rangoMes(mes);
    const prestamos = await this.prisma.prestamoAudiovisual.findMany({
      where: { salidaEn: { gte: rango.desde, lte: rango.hasta } },
      select: { id: true },
      orderBy: { salidaEn: 'asc' },
    });
    if (!prestamos.length) throw new BadRequestException('No hay préstamos audiovisuales para el mes seleccionado.');
    const archivos = [] as Array<{ nombre: string; contenido: Buffer }>;
    for (const prestamo of prestamos) {
      archivos.push({ nombre: `Prestamo_Audiovisual_${prestamo.id}.pdf`, contenido: await this.generarPrestamoAudiovisualPdf(prestamo.id) });
    }
    return this.comprimirPdfs(archivos);
  }

  async generarAsistenciasMesPdf(mes: string): Promise<Buffer> {
    const rango = this.rangoMes(mes);
    const asistencias = await this.prisma.asistenciaDocente.findMany({
      where: { fecha: { gte: rango.desde, lte: rango.hasta } },
      select: { fecha: true },
      distinct: ['fecha'],
      orderBy: { fecha: 'asc' },
    });
    if (!asistencias.length) throw new BadRequestException('No hay asistencias registradas para el mes seleccionado.');
    const fechas = asistencias.flatMap((asistencia) => {
      // La fecha de asistencia se persiste a medianoche UTC; no convertirla
      // a Bogotá para evitar que retroceda un día al formar el nombre y PDF.
      const fecha = asistencia.fecha.toISOString().slice(0, 10);
      // La consulta solo contiene días con registros; se conserva la regla
      // institucional de no generar formato SIGUD en domingos o festivos.
      return new Date(`${fecha}T12:00:00.000Z`).getUTCDay() === 0 || this.esFestivo(fecha) ? [] : [fecha];
    });
    const archivos = await this.generarEnParalelo(fechas, async (fecha) => ({
      nombre: `Asistencia_SIGUD_${fecha}.pdf`,
      contenido: await this.generarAsistenciaSigudPdf(fecha),
    }));
    if (!archivos.length) throw new BadRequestException('No hay días hábiles con asistencia para generar en el mes seleccionado.');
    return this.comprimirPdfs(archivos);
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
                estudiante: r.estudiante?.nombre ?? 'Docente responsable',
                codigoEstudiante: r.estudiante?.codigo ?? 'No disponible',
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
                aula: r.aula?.codigo ?? r.salonTexto,
                docente: r.docente?.nombre ?? r.docenteNombre,
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

  private rangoMes(mes: string): { desde: Date; hasta: Date } {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new BadRequestException('mes debe tener formato YYYY-MM.');
    const [anio, numeroMes] = mes.split('-').map(Number);
    const inicio = new Date(Date.UTC(anio, numeroMes - 1, 1));
    const ultimoDia = new Date(Date.UTC(anio, numeroMes, 0));
    const hoy = this.partesBogota(new Date()).fecha;
    const mesActual = hoy.slice(0, 7);
    if (mes > mesActual) throw new BadRequestException('No se pueden generar fichas para un mes futuro.');
    const hastaTexto = mes === mesActual ? hoy : ultimoDia.toISOString().slice(0, 10);
    return { desde: inicio, hasta: new Date(`${hastaTexto}T23:59:59.999Z`) };
  }

  private rangoMesCompleto(mes: string): { desde: Date; hasta: Date } {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new BadRequestException('mes debe tener formato YYYY-MM.');
    const [anio, numeroMes] = mes.split('-').map(Number);
    const hoy = this.partesBogota(new Date()).fecha;
    if (mes > hoy.slice(0, 7)) throw new BadRequestException('No se pueden generar fichas para un mes futuro.');
    return {
      desde: new Date(Date.UTC(anio, numeroMes - 1, 1)),
      hasta: new Date(Date.UTC(anio, numeroMes, 0, 23, 59, 59, 999)),
    };
  }

  private comprimirPdfs(archivos: Array<{ nombre: string; contenido: Buffer }>): Buffer {
    const locales: Buffer[] = [];
    const centrales: Buffer[] = [];
    let desplazamiento = 0;
    for (const archivo of archivos) {
      const nombre = Buffer.from(archivo.nombre, 'utf8');
      const crc = this.crc32(archivo.contenido);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(0, 8);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(archivo.contenido.length, 18);
      local.writeUInt32LE(archivo.contenido.length, 22);
      local.writeUInt16LE(nombre.length, 26);
      locales.push(local, nombre, archivo.contenido);
      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0x0800, 8);
      central.writeUInt16LE(0, 10);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(archivo.contenido.length, 20);
      central.writeUInt32LE(archivo.contenido.length, 24);
      central.writeUInt16LE(nombre.length, 28);
      central.writeUInt32LE(desplazamiento, 42);
      centrales.push(central, nombre);
      desplazamiento += local.length + nombre.length + archivo.contenido.length;
    }
    const directorio = Buffer.concat(centrales);
    const final = Buffer.alloc(22);
    final.writeUInt32LE(0x06054b50, 0);
    final.writeUInt16LE(archivos.length, 8);
    final.writeUInt16LE(archivos.length, 10);
    final.writeUInt32LE(directorio.length, 12);
    final.writeUInt32LE(desplazamiento, 16);
    return Buffer.concat([...locales, directorio, final]);
  }

  /**
   * El renderizador usa LibreOffice, por lo que generar un mes completo de
   * forma estrictamente secuencial puede agotar el tiempo de espera del proxy.
   * Cuatro conversiones simultáneas reducen el tiempo de forma suficiente para
   * los meses con muchas fichas, sin lanzar todas las conversiones a la vez.
   */
  private async generarEnParalelo<T, R>(
    elementos: T[],
    generar: (elemento: T) => Promise<R>,
    concurrencia = 4,
  ): Promise<R[]> {
    const resultados: R[] = [];
    for (let indice = 0; indice < elementos.length; indice += concurrencia) {
      resultados.push(...await Promise.all(elementos.slice(indice, indice + concurrencia).map(generar)));
    }
    return resultados;
  }

  private crc32(contenido: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of contenido) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
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
