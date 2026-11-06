// Feature: monitoreo-software-conexion-permisos, Property 1: esErrorDeDisponibilidad
// devuelve true si y solo si algún nivel (hasta profundidad 3, recorriendo `cause` y
// `errors` de AggregateError) tiene un código de red de disponibilidad, un SQLSTATE de
// clase 08, 28P01/28000/57P01/57P02/57P03/57014 o un mensaje de no disponibilidad
// conocido; en cualquier otro caso (incluidos 25006, 42P01, 42501 y no-objetos) false.

import fc from 'fast-check';
import {
  CODIGOS_RED_NO_DISPONIBLE,
  MENSAJES_PG_NO_DISPONIBLE,
  SQLSTATE_NO_DISPONIBLE,
  esErrorDeDisponibilidad,
} from './softracker-db.errors';

const PROFUNDIDAD_MAXIMA = 3;

// --- Modelo de referencia (oráculo) independiente de la implementación ----------

/** `true` si el nivel actual cumple alguna regla de disponibilidad, sin recursión. */
function nivelOraculo(valor: Record<string, unknown>): boolean {
  const code = typeof valor.code === 'string' ? valor.code : null;
  if (code !== null) {
    if (CODIGOS_RED_NO_DISPONIBLE.has(code)) {
      return true;
    }
    if (code.length === 5 && code.startsWith('08')) {
      return true;
    }
    if (SQLSTATE_NO_DISPONIBLE.has(code)) {
      return true;
    }
  }

  const message = typeof valor.message === 'string' ? valor.message : null;
  if (
    message !== null &&
    MENSAJES_PG_NO_DISPONIBLE.some((conocido) => message.includes(conocido))
  ) {
    return true;
  }

  return false;
}

/** Modelo recursivo: evalúa el nivel y, si profundidad < 3, `cause` y `errors`. */
function oraculo(valor: unknown, profundidad: number): boolean {
  if (valor === null || typeof valor !== 'object') {
    return false;
  }

  const registro = valor as Record<string, unknown>;

  if (nivelOraculo(registro)) {
    return true;
  }

  if (profundidad >= PROFUNDIDAD_MAXIMA) {
    return false;
  }

  if (oraculo(registro.cause, profundidad + 1)) {
    return true;
  }

  const errores = registro.errors;
  if (Array.isArray(errores)) {
    for (const anidado of errores) {
      if (oraculo(anidado, profundidad + 1)) {
        return true;
      }
    }
  }

  return false;
}

function esErrorDeDisponibilidadOraculo(valor: unknown): boolean {
  return oraculo(valor, 0);
}

// --- Generadores fast-check ------------------------------------------------------

const CODIGOS_RED = [...CODIGOS_RED_NO_DISPONIBLE];
const SQLSTATE_PUNTUALES = [...SQLSTATE_NO_DISPONIBLE];

/** Código dentro del conjunto de disponibilidad (red o SQLSTATE puntual). */
const codigoDentro: fc.Arbitrary<string> = fc.constantFrom(
  ...CODIGOS_RED,
  ...SQLSTATE_PUNTUALES,
);

/** SQLSTATE de 5 caracteres con prefijo '08' (clase de excepciones de conexión). */
const sqlstateClase08: fc.Arbitrary<string> = fc
  .string({
    unit: fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    minLength: 3,
    maxLength: 3,
  })
  .map((sufijo) => `08${sufijo}`);

/** Códigos que NO deben clasificar como disponibilidad (incluye 25006, 42P01, 42501). */
const codigoFuera: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom('25006', '42P01', '42501', '42601', '23505', '00000'),
  // SQLSTATE de 5 chars que no empiezan por '08' ni están en el conjunto puntual.
  fc
    .string({
      unit: fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
      minLength: 5,
      maxLength: 5,
    })
    .filter(
      (c) =>
        !c.startsWith('08') &&
        !SQLSTATE_NO_DISPONIBLE.has(c) &&
        !CODIGOS_RED_NO_DISPONIBLE.has(c),
    ),
  // Cadenas arbitrarias que no caen en ninguna regla de código.
  fc
    .string()
    .filter(
      (c) =>
        !CODIGOS_RED_NO_DISPONIBLE.has(c) &&
        !SQLSTATE_NO_DISPONIBLE.has(c) &&
        !(c.length === 5 && c.startsWith('08')),
    ),
);

/** Mensaje que incrusta un texto conocido rodeado de texto aleatorio. */
const mensajeConocido: fc.Arbitrary<string> = fc
  .tuple(
    fc.string(),
    fc.constantFrom(...MENSAJES_PG_NO_DISPONIBLE),
    fc.string(),
  )
  .map(([prefijo, conocido, sufijo]) => `${prefijo}${conocido}${sufijo}`);

/** Mensaje aleatorio que no contiene ninguno de los textos conocidos. */
const mensajeDesconocido: fc.Arbitrary<string> = fc
  .string()
  .filter((m) => !MENSAJES_PG_NO_DISPONIBLE.some((c) => m.includes(c)));

/** Valor que no es objeto: número, string, null, undefined, boolean, bigint. */
const noObjeto: fc.Arbitrary<unknown> = fc.oneof(
  fc.integer(),
  fc.double(),
  fc.string(),
  fc.constant(null),
  fc.constant(undefined),
  fc.boolean(),
);

/**
 * Objeto hoja estilo error de `pg`: `code` y/o `message` con combinaciones
 * dentro/fuera de las reglas, para cubrir ambas direcciones del "si y solo si".
 */
const hojaError: fc.Arbitrary<Record<string, unknown>> = fc.record(
  {
    code: fc.option(fc.oneof(codigoDentro, sqlstateClase08, codigoFuera), {
      nil: undefined,
    }),
    message: fc.option(fc.oneof(mensajeConocido, mensajeDesconocido), {
      nil: undefined,
    }),
  },
  { requiredKeys: [] },
);

/** Cualquier nodo hoja: objeto de error o valor no objeto. */
const hoja: fc.Arbitrary<unknown> = fc.oneof(
  { weight: 3, arbitrary: hojaError },
  { weight: 1, arbitrary: noObjeto },
);

/**
 * Árbol de errores con envolturas `cause`/`errors` (AggregateError) de
 * profundidad 0 a 3. `fc.letrec` controla la profundidad del grafo.
 */
const arbolError: fc.Arbitrary<unknown> = fc.letrec<{ nodo: unknown }>(
  (tie) => ({
    nodo: fc.oneof(
      { maxDepth: PROFUNDIDAD_MAXIMA },
      { weight: 2, arbitrary: hoja },
      {
        weight: 1,
        arbitrary: fc.record(
          {
            code: fc.option(
              fc.oneof(codigoDentro, sqlstateClase08, codigoFuera),
              {
                nil: undefined,
              },
            ),
            message: fc.option(fc.oneof(mensajeConocido, mensajeDesconocido), {
              nil: undefined,
            }),
            cause: fc.option(tie('nodo'), { nil: undefined }),
            errors: fc.option(fc.array(tie('nodo'), { maxLength: 3 }), {
              nil: undefined,
            }),
          },
          { requiredKeys: [] },
        ),
      },
    ),
  }),
).nodo;

// --- Propiedad -------------------------------------------------------------------

describe('esErrorDeDisponibilidad (Property 1: clasificación total de errores)', () => {
  it('coincide con el modelo de referencia para cualquier error generado', () => {
    fc.assert(
      fc.property(arbolError, (valor) => {
        expect(esErrorDeDisponibilidad(valor)).toBe(
          esErrorDeDisponibilidadOraculo(valor),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('clasifica como disponibilidad cualquier hoja con regla positiva', () => {
    const hojaPositiva = fc.oneof(
      fc.record({ code: codigoDentro }),
      fc.record({ code: sqlstateClase08 }),
      fc.record({ message: mensajeConocido }),
    );
    fc.assert(
      fc.property(hojaPositiva, (valor) => {
        expect(esErrorDeDisponibilidad(valor)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('no clasifica como disponibilidad las hojas sin regla ni los no-objetos', () => {
    const hojaNegativa = fc.oneof(
      fc.record(
        { code: codigoFuera, message: mensajeDesconocido },
        { requiredKeys: [] },
      ),
      noObjeto,
    );
    fc.assert(
      fc.property(hojaNegativa, (valor) => {
        expect(esErrorDeDisponibilidad(valor)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('detecta la regla positiva solo dentro de la profundidad 3', () => {
    // Un error de disponibilidad envuelto exactamente en N niveles de `cause`.
    const anidar = (profundidad: number): unknown => {
      let nodo: unknown = { code: 'ECONNREFUSED' };
      for (let i = 0; i < profundidad; i++) {
        nodo = { code: '25006', cause: nodo };
      }
      return nodo;
    };
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6 }), (profundidad) => {
        expect(esErrorDeDisponibilidad(anidar(profundidad))).toBe(
          profundidad <= PROFUNDIDAD_MAXIMA,
        );
      }),
      { numRuns: 100 },
    );
  });
});
