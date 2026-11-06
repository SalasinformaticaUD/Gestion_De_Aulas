// Feature: monitoreo-software-conexion-permisos, Property 6: Validación del
// preflight para SOFTRACKER_DATABASE_URL. Para cualquier valor de entrada,
// validarSoftrackerUrl(valor) devuelve exactamente
// ["SOFTRACKER_DATABASE_URL debe configurarse con un valor real."] si el valor
// es ausente/vacío/solo espacios o contiene CHANGE_ME en cualquier combinación
// de mayúsculas y minúsculas; ["SOFTRACKER_DATABASE_URL debe ser una URL
// PostgreSQL válida."] si no se cumple lo anterior y el valor no es
// interpretable por `new URL` o su protocolo no es `postgresql:` ni `postgres:`;
// y [] para cualquier URL interpretable con protocolo `postgresql:`/`postgres:`
// sin CHANGE_ME. CHANGE_ME tiene prioridad sobre el chequeo de formato.
// Validates: Requirements 2.6, 2.7, 2.8.

import fc from 'fast-check';

// El script es CommonJS. Requerirlo NO debe disparar process.exit porque la
// ejecución del preflight está envuelta en `if (require.main === module)`; que
// este archivo cargue y corra sin salir verifica esa condición implícitamente.

/* eslint-disable @typescript-eslint/no-require-imports */
const { validarSoftrackerUrl } =
  require('../../scripts/validate-docker-env.cjs') as {
    validarSoftrackerUrl: (valor: unknown) => string[];
  };
/* eslint-enable @typescript-eslint/no-require-imports */

const MENSAJE_VALOR_REAL =
  'SOFTRACKER_DATABASE_URL debe configurarse con un valor real.';
const MENSAJE_FORMATO =
  'SOFTRACKER_DATABASE_URL debe ser una URL PostgreSQL válida.';

// --- Modelo de referencia (oráculo) independiente de la implementación --------

function oraculo(valor: unknown): string[] {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto || texto.toUpperCase().includes('CHANGE_ME')) {
    return [MENSAJE_VALOR_REAL];
  }
  try {
    const url = new URL(texto);
    if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
      return [MENSAJE_FORMATO];
    }
  } catch {
    return [MENSAJE_FORMATO];
  }
  return [];
}

// --- Generadores --------------------------------------------------------------

/** Mezcla la capitalización de cada letra de 'change_me' al azar. */
const changeMeMixto = fc
  .array(fc.boolean(), { minLength: 8, maxLength: 8 })
  .map((mayus) =>
    'change_me'
      .split('')
      .map((c, i) => (mayus[i] ? c.toUpperCase() : c.toLowerCase()))
      .join(''),
  );

/** URLs postgres(ql) válidas que embeben una variante de CHANGE_ME. */
const urlConChangeMe = fc
  .tuple(
    fc.constantFrom('postgresql', 'postgres'),
    changeMeMixto,
    fc.domain(),
    fc.integer({ min: 1, max: 65535 }),
    fc
      .string({ minLength: 1, maxLength: 8 })
      .filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
  )
  .map(
    ([esquema, cm, host, puerto, base]) =>
      `${esquema}://usuario:${cm}@${host}:${puerto}/${base}`,
  );

/** Cadenas compuestas solo por espacios en blanco (o vacías). */
const soloEspacios = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), {
    minLength: 0,
    maxLength: 10,
  })
  .map((partes) => partes.join(''));

/** URLs con protocolo arbitrario distinto de postgres(ql): error de formato. */
const urlOtroProtocolo = fc
  .tuple(
    fc.constantFrom('http', 'https', 'ftp', 'mysql', 'redis', 'file', 'ws'),
    fc.domain(),
  )
  .map(([esquema, host]) => `${esquema}://${host}/recurso`);

/** Cadenas no interpretables como URL (sin esquema, sin CHANGE_ME). */
const noUrl = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => {
  if (s.trim() === '') return false;
  if (s.toUpperCase().includes('CHANGE_ME')) return false;
  try {
    new URL(s);
    return false; // descartamos las que sí son URL
  } catch {
    return true;
  }
});

/** URLs postgres(ql) válidas sin CHANGE_ME: resultado []. */
const urlValida = fc
  .tuple(
    fc.constantFrom('postgresql', 'postgres'),
    fc.domain(),
    fc.option(fc.integer({ min: 1, max: 65535 }), { nil: undefined }),
    fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
    fc.boolean(),
  )
  .map(([esquema, host, puerto, base, conCredenciales]) => {
    const credenciales = conCredenciales ? 'user:pass@' : '';
    const sufijoPuerto = puerto === undefined ? '' : `:${puerto}`;
    return `${esquema}://${credenciales}${host}${sufijoPuerto}/${base}`;
  })
  // Garantizamos que ninguna variante contenga CHANGE_ME por accidente.
  .filter((url) => !url.toUpperCase().includes('CHANGE_ME'));

describe('validarSoftrackerUrl (Property 6)', () => {
  it('requerir el .cjs no dispara process.exit (es CommonJS envuelto en require.main)', () => {
    expect(typeof validarSoftrackerUrl).toBe('function');
  });

  it('coincide con el oráculo para cualquier valor de entrada', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(undefined),
          fc.constant(''),
          soloEspacios,
          changeMeMixto,
          urlConChangeMe,
          urlOtroProtocolo,
          noUrl,
          urlValida,
          fc.string(),
        ),
        (valor) => {
          expect(validarSoftrackerUrl(valor)).toEqual(oraculo(valor));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('devuelve el mensaje de valor real para ausente/vacío/solo espacios', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(undefined), fc.constant(''), soloEspacios),
        (valor) => {
          expect(validarSoftrackerUrl(valor)).toEqual([MENSAJE_VALOR_REAL]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('devuelve el mensaje de valor real para cualquier variante de CHANGE_ME, incluso en URLs válidas', () => {
    fc.assert(
      fc.property(fc.oneof(changeMeMixto, urlConChangeMe), (valor) => {
        expect(validarSoftrackerUrl(valor)).toEqual([MENSAJE_VALOR_REAL]);
      }),
      { numRuns: 100 },
    );
  });

  it('devuelve el mensaje de formato para protocolos no postgres y para no-URLs', () => {
    fc.assert(
      fc.property(fc.oneof(urlOtroProtocolo, noUrl), (valor) => {
        expect(validarSoftrackerUrl(valor)).toEqual([MENSAJE_FORMATO]);
      }),
      { numRuns: 100 },
    );
  });

  it('devuelve [] para URLs PostgreSQL válidas sin CHANGE_ME', () => {
    fc.assert(
      fc.property(urlValida, (valor) => {
        expect(validarSoftrackerUrl(valor)).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
