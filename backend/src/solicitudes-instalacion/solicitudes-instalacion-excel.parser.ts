import * as XLSX from 'xlsx';

export type SolicitudExcelSoftware = {
  posicion: number;
  nombreOriginal: string;
};

export type SolicitudExcelItem = {
  posicion: number;
  asignaturaOriginal: string | null;
  observaciones: string | null;
  aulasOriginales: string[];
  software: SolicitudExcelSoftware[];
  alertas: string[];
  datosOriginales: Record<string, unknown>;
};

export type SolicitudExcelFila = {
  filaOrigen: number;
  identificadorOrigen: string | null;
  fechaInicioFormulario: Date | null;
  fechaPeticion: Date;
  correoRespondienteOriginal: string | null;
  nombreRespondienteOriginal: string | null;
  docenteNombreOriginal: string | null;
  docenteCorreoOriginal: string | null;
  proyectoCurricularOriginal: string | null;
  observacionGeneral: string | null;
  consentimientoDatos: boolean | null;
  historicaAlImportar: boolean;
  motivoHistorialInicial:
    'FECHA_ANTERIOR_CORTE' | 'SOFTWARE_MARCADO_VERDE' | null;
  alertas: string[];
  datosOriginales: Record<string, unknown>;
  items: SolicitudExcelItem[];
};

export type SolicitudExcelError = {
  fila: number;
  mensaje: string;
};

export type ResultadoLecturaSolicitudesExcel = {
  totalFilas: number;
  solicitudes: SolicitudExcelFila[];
  errores: SolicitudExcelError[];
};

const COLUMNAS = {
  ID: 0,
  INICIO: 1,
  FINALIZACION: 2,
  CORREO_RESPONDIENTE: 3,
  NOMBRE_RESPONDIENTE: 4,
  DOCENTE: 6,
  CORREO_DOCENTE: 7,
  PROYECTO: 8,
  AULAS_SELECCION: 9,
  ASIGNATURA_PRINCIPAL: 10,
  AULAS_TEXTO: 11,
  SOFTWARE_PRINCIPAL: 12,
  OBSERVACION_GENERAL: 30,
} as const;

const BLOQUES_ADICIONALES = [
  { posicion: 2, continuar: 13, asignatura: 14, software: 15, observacion: 16 },
  { posicion: 3, continuar: 17, asignatura: 18, software: 19, observacion: 20 },
  { posicion: 4, continuar: 21, asignatura: 22, software: 23, observacion: 24 },
  { posicion: 5, continuar: 25, asignatura: 26, software: 27, observacion: 28 },
] as const;

const COLUMNAS_SOFTWARE = [
  COLUMNAS.SOFTWARE_PRINCIPAL,
  ...BLOQUES_ADICIONALES.map((bloque) => bloque.software),
];

export const FECHA_CORTE_HISTORIAL = new Date('2026-07-15T00:00:00.000Z');

const ENCABEZADOS_REQUERIDOS = [
  [COLUMNAS.ID, 'ID'],
  [COLUMNAS.INICIO, 'HORA DE INICIO'],
  [COLUMNAS.FINALIZACION, 'HORA DE FINALIZACION'],
  [COLUMNAS.DOCENTE, 'NOMBRE COMPLETO DEL DOCENTE'],
  [COLUMNAS.CORREO_DOCENTE, 'CORREO ELECTRONICO INSTITUCIONAL DEL DOCENTE'],
  [COLUMNAS.PROYECTO, 'SELECCIONE EL PROYECTO CURRICULAR'],
  [COLUMNAS.SOFTWARE_PRINCIPAL, 'INDIQUE EL NOMBRE DEL SOFTWARE'],
] as const;

export function leerSolicitudesExcel(
  buffer: Buffer,
): ResultadoLecturaSolicitudesExcel {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellStyles: true,
  });
  const primeraHoja = workbook.Sheets[workbook.SheetNames[0] ?? ''];
  if (!primeraHoja) throw new Error('El archivo Excel no contiene hojas.');

  const filas = XLSX.utils.sheet_to_json<unknown[]>(primeraHoja, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  });
  if (filas.length < 2)
    throw new Error('El archivo Excel no contiene respuestas.');

  const encabezados = filas[0].map((valor) => texto(valor));
  validarEncabezados(encabezados);

  const solicitudes: SolicitudExcelFila[] = [];
  const errores: SolicitudExcelError[] = [];
  const filasDatos = filas
    .slice(1)
    .filter((fila) => fila.some((valor) => texto(valor)));

  filasDatos.forEach((fila, indice) => {
    const filaExcel = indice + 2;
    try {
      solicitudes.push(
        convertirFila(fila, encabezados, filaExcel, primeraHoja),
      );
    } catch (error) {
      errores.push({
        fila: filaExcel,
        mensaje:
          error instanceof Error
            ? error.message
            : 'No fue posible interpretar la fila.',
      });
    }
  });

  return { totalFilas: filasDatos.length, solicitudes, errores };
}

function convertirFila(
  fila: unknown[],
  encabezados: string[],
  filaExcel: number,
  hoja: XLSX.WorkSheet,
): SolicitudExcelFila {
  const fechaInicioFormulario = fechaExcel(fila[COLUMNAS.INICIO]);
  const fechaPeticion =
    fechaExcel(fila[COLUMNAS.FINALIZACION]) ?? fechaInicioFormulario;
  if (!fechaPeticion) throw new Error('La fecha de la petición no es válida.');

  const aulas = unicos([
    ...separarAulas(fila[COLUMNAS.AULAS_SELECCION]),
    ...separarAulas(fila[COLUMNAS.AULAS_TEXTO]),
  ]);
  const observacionGeneral = textoONull(fila[COLUMNAS.OBSERVACION_GENERAL]);
  const alertas: string[] = [];
  const docenteNombreOriginal = textoONull(fila[COLUMNAS.DOCENTE]);
  const docenteCorreoOriginal = textoONull(fila[COLUMNAS.CORREO_DOCENTE]);
  const proyectoCurricularOriginal =
    textoONull(fila[COLUMNAS.PROYECTO])?.toLocaleUpperCase('es-CO') ?? null;

  if (!docenteNombreOriginal) alertas.push('Falta el nombre del docente.');
  if (!docenteCorreoOriginal)
    alertas.push('Falta el correo institucional del docente.');
  if (!proyectoCurricularOriginal)
    alertas.push('Falta el proyecto curricular.');
  if (!aulas.length)
    alertas.push('No se especificaron aulas para la instalación.');
  const consentimientoDatos = true;

  const items: SolicitudExcelItem[] = [];
  const principal = crearItem({
    posicion: 1,
    asignatura: fila[COLUMNAS.ASIGNATURA_PRINCIPAL],
    software: fila[COLUMNAS.SOFTWARE_PRINCIPAL],
    observacion: observacionGeneral,
    aulas,
  });
  if (principal) items.push(principal);

  for (const bloque of BLOQUES_ADICIONALES) {
    const item = crearItem({
      posicion: bloque.posicion,
      asignatura: fila[bloque.asignatura],
      software: fila[bloque.software],
      observacion: fila[bloque.observacion],
      aulas,
    });
    if (item) items.push(item);
    else if (esSi(fila[bloque.continuar])) {
      alertas.push(
        `La solicitud adicional ${bloque.posicion - 1} fue marcada, pero no contiene datos.`,
      );
    }
  }

  if (!items.some((item) => item.software.length)) {
    throw new Error('La fila no contiene software solicitado.');
  }
  items
    .flatMap((item) => item.alertas)
    .forEach((alerta) => alertas.push(alerta));

  const softwareMarcadoVerde = COLUMNAS_SOFTWARE.some((columna) => {
    if (!texto(fila[columna])) return false;
    const direccion = XLSX.utils.encode_cell({ r: filaExcel - 1, c: columna });
    const celda = hoja[direccion] as XLSX.CellObject | undefined;
    return esCeldaVerde(celda);
  });
  const clasificacion = clasificarHistorial(
    fechaPeticion,
    softwareMarcadoVerde,
  );

  return {
    filaOrigen: filaExcel,
    identificadorOrigen: textoONull(fila[COLUMNAS.ID]),
    fechaInicioFormulario,
    fechaPeticion,
    correoRespondienteOriginal: textoONull(fila[COLUMNAS.CORREO_RESPONDIENTE]),
    nombreRespondienteOriginal: textoONull(fila[COLUMNAS.NOMBRE_RESPONDIENTE]),
    docenteNombreOriginal,
    docenteCorreoOriginal,
    proyectoCurricularOriginal,
    observacionGeneral,
    consentimientoDatos,
    historicaAlImportar: clasificacion.historica,
    motivoHistorialInicial: clasificacion.motivo,
    alertas: unicos(alertas),
    datosOriginales: objetoOriginal(encabezados, fila),
    items,
  };
}

export function clasificarHistorial(
  fechaPeticion: Date,
  softwareMarcadoVerde: boolean,
): {
  historica: boolean;
  motivo: 'FECHA_ANTERIOR_CORTE' | 'SOFTWARE_MARCADO_VERDE' | null;
} {
  if (fechaPeticion.getTime() < FECHA_CORTE_HISTORIAL.getTime()) {
    return { historica: true, motivo: 'FECHA_ANTERIOR_CORTE' };
  }
  if (softwareMarcadoVerde) {
    return { historica: true, motivo: 'SOFTWARE_MARCADO_VERDE' };
  }
  return { historica: false, motivo: null };
}

export function esCeldaVerde(celda: XLSX.CellObject | undefined): boolean {
  const estilo = celda?.s as { fgColor?: { rgb?: string } } | undefined;
  const color = estilo?.fgColor?.rgb?.replace(/^FF(?=[0-9A-F]{6}$)/i, '');
  if (!color || !/^[0-9A-F]{6}$/i.test(color)) return false;
  const rojo = Number.parseInt(color.slice(0, 2), 16);
  const verde = Number.parseInt(color.slice(2, 4), 16);
  const azul = Number.parseInt(color.slice(4, 6), 16);
  return verde >= rojo + 10 && verde >= azul + 10;
}

function crearItem(input: {
  posicion: number;
  asignatura: unknown;
  software: unknown;
  observacion: unknown;
  aulas: string[];
}): SolicitudExcelItem | null {
  const asignaturaOriginal = textoONull(input.asignatura);
  const observaciones = textoONull(input.observacion);
  const programas = separarSoftware(input.software);
  if (!asignaturaOriginal && !programas.length && !observaciones) return null;

  const alertas: string[] = [];
  if (!asignaturaOriginal)
    alertas.push(`El ítem ${input.posicion} no tiene asignatura.`);
  if (!programas.length)
    alertas.push(`El ítem ${input.posicion} no tiene software.`);

  return {
    posicion: input.posicion,
    asignaturaOriginal,
    observaciones,
    aulasOriginales: input.aulas,
    software: programas.map((nombreOriginal, posicion) => ({
      posicion: posicion + 1,
      nombreOriginal,
    })),
    alertas,
    datosOriginales: {
      asignatura: asignaturaOriginal,
      software: textoONull(input.software),
      observaciones,
      aulas: input.aulas,
    },
  };
}

export function separarSoftware(valor: unknown): string[] {
  return separarFueraDeParentesis(texto(valor), true);
}

export function extraerAulas(valor: unknown): string[] {
  return unicos(texto(valor).match(/(?<!\d)\d{3}(?!\d)/g) ?? []);
}

function separarAulas(valor: unknown): string[] {
  return extraerAulas(valor);
}

function separarFueraDeParentesis(
  valor: string,
  separarComas: boolean,
): string[] {
  const resultado: string[] = [];
  let actual = '';
  let profundidad = 0;
  const finalizar = () => {
    const limpio = actual.replace(/^\s*[-*•]+\s*/, '').trim();
    if (limpio) resultado.push(limpio);
    actual = '';
  };

  for (const caracter of valor.replace(/\r/g, '')) {
    if (caracter === '(' || caracter === '[') profundidad += 1;
    if (caracter === ')' || caracter === ']')
      profundidad = Math.max(0, profundidad - 1);
    const esSeparadorFijo =
      caracter === '\n' || caracter === ';' || caracter === '•';
    if (
      profundidad === 0 &&
      (esSeparadorFijo || (separarComas && caracter === ','))
    ) {
      finalizar();
    } else {
      actual += caracter;
    }
  }
  finalizar();
  return unicos(resultado);
}

function validarEncabezados(encabezados: string[]): void {
  const faltantes = ENCABEZADOS_REQUERIDOS.filter(
    ([indice, esperado]) =>
      !normalizar(encabezados[indice] ?? '').startsWith(esperado),
  ).map(([, esperado]) => esperado);
  if (faltantes.length) {
    throw new Error(
      `La estructura del Excel no corresponde al formulario esperado. Faltan: ${faltantes.join(', ')}.`,
    );
  }
}

function fechaExcel(valor: unknown): Date | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;
  if (typeof valor === 'number') {
    const fecha = new Date(Date.UTC(1899, 11, 30) + valor * 86_400_000);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  const cadena = texto(valor);
  if (!cadena) return null;
  const fecha = new Date(cadena);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function objetoOriginal(
  encabezados: string[],
  fila: unknown[],
): Record<string, unknown> {
  return Object.fromEntries(
    encabezados.map((encabezado, indice) => [
      encabezado || `Columna ${indice + 1}`,
      valorJson(fila[indice]),
    ]),
  );
}

function valorJson(valor: unknown): unknown {
  if (valor === undefined || valor === '') return null;
  if (valor instanceof Date) return valor.toISOString();
  if (
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean' ||
    valor === null
  )
    return valor;
  return null;
}

function esSi(valor: unknown): boolean {
  return normalizar(texto(valor)) === 'SI';
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return String(valor).trim();
  }
  return '';
}

function textoONull(valor: unknown): string | null {
  return texto(valor) || null;
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function unicos(valores: string[]): string[] {
  const vistos = new Set<string>();
  return valores.filter((valor) => {
    const clave = normalizar(valor);
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
