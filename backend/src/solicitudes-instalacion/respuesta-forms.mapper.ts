import { BadRequestException } from '@nestjs/common';
import type { ImportarRespuestaFormsDto } from './dto/importar-respuesta-forms.dto';
import {
  clasificarHistorial,
  extraerAulas,
  separarSoftware,
  type SolicitudExcelFila,
  type SolicitudExcelItem,
} from './solicitudes-instalacion-excel.parser';

export function convertirRespuestaForms(
  dto: ImportarRespuestaFormsDto,
): SolicitudExcelFila {
  const fechaPeticion = new Date(dto.fechaRecepcion);
  if (Number.isNaN(fechaPeticion.getTime())) {
    throw new BadRequestException('La fecha de recepción no es válida.');
  }

  const aulas = unicos([
    ...leerAulas(dto.aulasSeleccionadas),
    ...leerAulas(dto.aulasEscritas),
  ]);
  const bloques = [
    {
      posicion: 1,
      asignatura: dto.asignatura1,
      software: dto.software1,
      observacion: dto.observacionGeneral,
    },
    {
      posicion: 2,
      asignatura: dto.asignatura2,
      software: dto.software2,
      observacion: dto.observacion2,
    },
    {
      posicion: 3,
      asignatura: dto.asignatura3,
      software: dto.software3,
      observacion: dto.observacion3,
    },
    {
      posicion: 4,
      asignatura: dto.asignatura4,
      software: dto.software4,
      observacion: dto.observacion4,
    },
    {
      posicion: 5,
      asignatura: dto.asignatura5,
      software: dto.software5,
      observacion: dto.observacion5,
    },
  ];
  const items = bloques
    .map((bloque) => crearItemForms({ ...bloque, aulas }))
    .filter((item): item is SolicitudExcelItem => Boolean(item));
  if (!items.some((item) => item.software.length)) {
    throw new BadRequestException(
      'La respuesta de Forms no contiene software solicitado.',
    );
  }

  const docenteNombreOriginal = textoONull(dto.docenteNombre);
  const docenteCorreoOriginal = textoONull(dto.docenteCorreo);
  const proyectoCurricularOriginal =
    textoONull(dto.proyectoCurricular)?.toLocaleUpperCase('es-CO') ?? null;
  const observacionGeneral = textoONull(dto.observacionGeneral);
  const alertas: string[] = [];
  if (!docenteNombreOriginal) alertas.push('Falta el nombre del docente.');
  if (!docenteCorreoOriginal)
    alertas.push('Falta el correo institucional del docente.');
  if (!proyectoCurricularOriginal)
    alertas.push('Falta el proyecto curricular.');
  if (!aulas.length)
    alertas.push('No se especificaron aulas para la instalación.');
  items
    .flatMap((item) => item.alertas)
    .forEach((alerta) => alertas.push(alerta));
  const clasificacion = clasificarHistorial(fechaPeticion, false);

  return {
    filaOrigen: 1,
    identificadorOrigen: `FORMS:${dto.responseId.trim()}`,
    fechaInicioFormulario: null,
    fechaPeticion,
    correoRespondienteOriginal: textoONull(dto.correoRespondiente),
    nombreRespondienteOriginal: textoONull(dto.nombreRespondiente),
    docenteNombreOriginal,
    docenteCorreoOriginal,
    proyectoCurricularOriginal,
    observacionGeneral,
    consentimientoDatos: true,
    historicaAlImportar: clasificacion.historica,
    motivoHistorialInicial: clasificacion.motivo,
    alertas: unicos(alertas),
    datosOriginales: { origen: 'MICROSOFT_FORMS', ...dto },
    items,
  };
}

function crearItemForms(input: {
  posicion: number;
  asignatura?: string;
  software?: string;
  observacion?: string;
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
    software: programas.map((nombreOriginal, indice) => ({
      posicion: indice + 1,
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

function leerAulas(valor: string): string[] {
  const textos: string[] = [];
  try {
    const parsed: unknown = JSON.parse(valor);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (typeof item === 'string') textos.push(item);
      });
    } else {
      textos.push(valor);
    }
  } catch {
    textos.push(valor);
  }
  return unicos(textos.flatMap((item) => extraerAulas(item)));
}

function textoONull(valor: unknown): string | null {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  return texto || null;
}

function unicos(valores: string[]): string[] {
  return [...new Set(valores)];
}
