import type { ValidacionPorDocumento } from './document-validation.types';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';

type EntradaResultado = {
  documentos: {
    tipo: string;
    estadoClasificacion: string;
    requiereOcr: boolean;
    requiereRevisionManual: boolean;
  }[];
  hallazgos: { codigo: string }[];
  comparacion: {
    resumen: { camposConDiferencias: number };
    campos: {
      campo: string;
      estado: string;
      fuentesIndependientes: number;
      noInterpretables: unknown[];
      tiposEnConflicto: string[];
    }[];
  };
  validacion: {
    documentos: ValidacionPorDocumento[];
    resumen: { inconsistencias: number; noVerificables: number };
  };
};

const DIFERENCIAS = new Set([
  'DOCUMENTO_FUERA_DE_ORDEN',
  'DOCUMENTO_DUPLICADO',
  'DIFERENCIA_NUMERICA',
  'DIFERENCIA_IDENTIFICACION',
  'DIFERENCIA_TIPO_IDENTIFICACION',
  'DIFERENCIA_FECHA',
  'DIFERENCIA_ORTOGRAFICA',
  'VALOR_PERSONAL_DIFERENTE',
  'CONFLICTO_INTERNO_CAMPO',
]);

export function determinarResultadoDocumental(
  entrada: EntradaResultado,
): 'SATISFACTORIA' | 'CON_INCONSISTENCIAS' | 'INCOMPLETA' {
  const { documentos, hallazgos, comparacion, validacion } = entrada;
  if (
    comparacion.resumen.camposConDiferencias > 0 ||
    validacion.resumen.inconsistencias > 0 ||
    validacion.documentos.some((d) =>
      d.comprobaciones.some((c) => c.estado === 'INCONSISTENCIA'),
    ) ||
    hallazgos.some((h) => DIFERENCIAS.has(h.codigo))
  )
    return 'CON_INCONSISTENCIAS';

  // El éxito exige evidencias positivas, además de ausencia de errores. No se
  // infiere de un contador cero ni de una lista vacía de hallazgos.
  const completos = DOCUMENTOS_REQUERIDOS.every(
    ({ tipo }) =>
      documentos.filter((d) => d.tipo === tipo).length === 1 &&
      validacion.documentos.filter((d) => d.tipo === tipo).length === 1,
  );
  const identidadComparable = [
    'nombreCompleto',
    'numeroIdentificacion',
    'tipoIdentificacion',
  ].every((campo) =>
    comparacion.campos.some(
      (c) =>
        c.campo === campo &&
        c.estado.startsWith('COINCIDENCIA') &&
        c.fuentesIndependientes >= 2,
    ),
  );
  const pendientes =
    hallazgos.length > 0 ||
    validacion.resumen.noVerificables > 0 ||
    documentos.some(
      (d) =>
        d.estadoClasificacion !== 'IDENTIFICADO' ||
        d.requiereOcr ||
        d.requiereRevisionManual,
    ) ||
    comparacion.campos.some(
      (c) => c.noInterpretables.length > 0 || c.tiposEnConflicto.length > 0,
    ) ||
    validacion.documentos.some(
      (d) =>
        !d.comprobaciones.length ||
        d.comprobaciones.some((c) => c.estado !== 'OK'),
    );
  return completos && identidadComparable && !pendientes
    ? 'SATISFACTORIA'
    : 'INCOMPLETA';
}

function objeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function comparacionValida(v: unknown): v is EntradaResultado['comparacion'] {
  return (
    objeto(v) &&
    objeto(v.resumen) &&
    typeof v.resumen.camposConDiferencias === 'number' &&
    v.resumen.camposConDiferencias >= 0 &&
    Array.isArray(v.campos) &&
    v.campos.every(
      (c: unknown) =>
        objeto(c) &&
        typeof c.campo === 'string' &&
        typeof c.estado === 'string' &&
        typeof c.fuentesIndependientes === 'number' &&
        c.fuentesIndependientes >= 0 &&
        Array.isArray(c.noInterpretables) &&
        Array.isArray(c.tiposEnConflicto),
    )
  );
}
function validacionValida(v: unknown): v is EntradaResultado['validacion'] {
  return (
    objeto(v) &&
    objeto(v.resumen) &&
    typeof v.resumen.inconsistencias === 'number' &&
    v.resumen.inconsistencias >= 0 &&
    typeof v.resumen.noVerificables === 'number' &&
    v.resumen.noVerificables >= 0 &&
    Array.isArray(v.documentos) &&
    v.documentos.every(
      (d: unknown) =>
        objeto(d) &&
        typeof d.documentoIndice === 'number' &&
        typeof d.tipo === 'string' &&
        Array.isArray(d.comprobaciones) &&
        d.comprobaciones.every(
          (c: unknown) =>
            objeto(c) &&
            typeof c.campo === 'string' &&
            typeof c.estado === 'string' &&
            ['OK', 'INCONSISTENCIA', 'NO_VERIFICABLE'].includes(c.estado) &&
            typeof c.codigo === 'string' &&
            typeof c.observacion === 'string' &&
            Array.isArray(c.valores),
        ),
    )
  );
}

// Los resultados antiguos también se verifican al leerlos, sin modificar el
// historial almacenado ni confiar en JSON incompleto o en un estado aislado.
export function comprobarCierrePersistido(entrada: {
  versionClasificacion: string | null;
  versionComparacion: string | null;
  resultadoComparacion: unknown;
  documentos: EntradaResultado['documentos'];
  hallazgos: EntradaResultado['hallazgos'];
}) {
  const resultado = entrada.resultadoComparacion;
  const validacion = objeto(resultado)
    ? resultado.validacionDocumental
    : undefined;
  if (
    !entrada.versionClasificacion ||
    !entrada.versionComparacion ||
    !comparacionValida(resultado) ||
    !validacionValida(validacion)
  )
    return 'INCOMPLETA' as const;
  return determinarResultadoDocumental({
    documentos: entrada.documentos,
    hallazgos: entrada.hallazgos,
    comparacion: resultado,
    validacion,
  });
}
