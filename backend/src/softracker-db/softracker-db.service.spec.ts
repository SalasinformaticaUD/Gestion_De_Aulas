import {
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import fc from 'fast-check';

import {
  construirConfigPool,
  MENSAJE_SOFTRACKER_ERROR_INTERNO,
  MENSAJE_SOFTRACKER_NO_DISPONIBLE,
  type SoftrackerPoolFactory,
} from './softracker-db.constants';
import { esErrorDeDisponibilidad } from './softracker-db.errors';
import { SoftrackerDbService } from './softracker-db.service';

// Feature: monitoreo-software-conexion-permisos, Property 3: consultar
// transporta la sentencia SQL, los parametros y las filas sin alterarlos.
describe('Property 3', () => {
  const URL_VALIDA_P3 =
    'postgresql://softracker_readonly:clave@softracker-db:5432/softracker';

  let urlOriginalP3: string | undefined;

  beforeEach(() => {
    urlOriginalP3 = process.env.SOFTRACKER_DATABASE_URL;
    process.env.SOFTRACKER_DATABASE_URL = URL_VALIDA_P3;
  });

  afterEach(() => {
    if (urlOriginalP3 === undefined) {
      delete process.env.SOFTRACKER_DATABASE_URL;
    } else {
      process.env.SOFTRACKER_DATABASE_URL = urlOriginalP3;
    }
    jest.restoreAllMocks();
  });

  it('invoca pool.query una vez con el sql y los params, y resuelve con las filas', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.array(fc.jsonValue()),
        fc.boolean(),
        fc.array(fc.object()),
        async (sql, params, omitirParams, rows) => {
          const query = jest.fn().mockResolvedValue({ rows });
          const on = jest.fn();
          const end = jest.fn();
          const poolFalso = { query, on, end };
          const crearPool: SoftrackerPoolFactory = () =>
            poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;

          const service = new SoftrackerDbService(crearPool);

          const resultado = omitirParams
            ? await service.consultar(sql)
            : await service.consultar(sql, params);

          // query llamado exactamente una vez.
          expect(query).toHaveBeenCalledTimes(1);

          const [sqlRecibido, paramsRecibidos] = query.mock.calls[0] as [
            unknown,
            unknown,
          ];

          // Primer arg === sql original.
          expect(sqlRecibido).toBe(sql);

          // Segundo arg es un array igual a params (o [] si se omitio).
          const paramsEsperados = omitirParams ? [] : params;
          expect(Array.isArray(paramsRecibidos)).toBe(true);
          expect(paramsRecibidos).toEqual(paramsEsperados);

          // El resultado resuelto es igual a las filas devueltas (vacio si no hubo).
          expect(resultado).toEqual(rows);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: monitoreo-software-conexion-permisos, Property 2: consultar traduce
// los errores del pool a ServiceUnavailableException (503) o
// InternalServerErrorException (500) sin exponer la cadena de conexion, el sql
// ni los params en el mensaje de la excepcion ni en el log.
describe('Property 2', () => {
  let urlOriginalP2: string | undefined;

  beforeEach(() => {
    urlOriginalP2 = process.env.SOFTRACKER_DATABASE_URL;
  });

  afterEach(() => {
    if (urlOriginalP2 === undefined) {
      delete process.env.SOFTRACKER_DATABASE_URL;
    } else {
      process.env.SOFTRACKER_DATABASE_URL = urlOriginalP2;
    }
    jest.restoreAllMocks();
  });

  it('rechaza con la excepcion y el mensaje correctos sin filtrar la cadena de conexion, el sql ni los params', async () => {
    // URL de conexion PostgreSQL valida con credenciales (usuario:clave@host:puerto/base).
    // Cada componente usa tokens distintivos y suficientemente largos para que la
    // comprobacion de "no filtra la cadena de conexion" no genere falsos positivos
    // por coincidencias triviales (p. ej. una clave de un solo caracter que aparece
    // por azar en el mensaje fijo en espanol). El objetivo de la propiedad es que el
    // secreto real no se filtre, no que una subcadena de 1 letra nunca aparezca.
    const tokenDistintivo = (prefijo: string) =>
      fc
        .stringMatching(/^[a-zA-Z0-9]{6,16}$/)
        .filter((s) => s.length >= 6)
        .map((s) => `${prefijo}${s}`);
    const arbUrlP2 = fc
      .record({
        usuario: tokenDistintivo('usr'),
        clave: tokenDistintivo('pwd'),
        host: tokenDistintivo('host'),
        puerto: fc.integer({ min: 1, max: 65535 }),
        base: tokenDistintivo('db'),
      })
      .map(
        ({ usuario, clave, host, puerto, base }) =>
          `postgresql://${usuario}:${clave}@${host}:${puerto}/${base}`,
      );

    // Sentencia SQL distintiva: su presencia en el mensaje de la excepcion seria
    // una fuga real, no una coincidencia con el texto fijo.
    const arbSqlP2 = tokenDistintivo('SELECT_').map((s) => `${s}_FROM_vista`);
    const arbParamsP2 = fc.array(
      fc.oneof(
        tokenDistintivo('param'),
        fc.integer(),
        fc.boolean(),
        fc.constant(null),
      ),
      { maxLength: 5 },
    );

    // Errores clasificados como disponibilidad (-> 503) y como internos (-> 500).
    const arbDisponibilidadP2 = fc.oneof(
      fc
        .constantFrom('ECONNREFUSED', '08006', '57014', '28P01', '57P03')
        .map((code) => ({ code, mensajeBase: 'db error' })),
      fc
        .constantFrom(
          'timeout exceeded when trying to connect',
          'Connection terminated due to connection timeout',
          'Connection terminated unexpectedly',
        )
        .map((mensajeBase) => ({ code: undefined, mensajeBase })),
    );
    const arbInternoP2 = fc
      .constantFrom('25006', '42P01', '42501', 'XX000')
      .map((code) => ({
        code: code,
        mensajeBase: 'db error',
      }));

    await fc.assert(
      fc.asyncProperty(
        arbUrlP2,
        arbSqlP2,
        arbParamsP2,
        fc.oneof(arbDisponibilidadP2, arbInternoP2),
        async (url, sql, params, base) => {
          process.env.SOFTRACKER_DATABASE_URL = url;

          // El message del error incrusta la URL, el sql y los params (datos sensibles).
          const paramsTexto = JSON.stringify(params);
          const error = new Error(
            `${base.mensajeBase}: url=${url} sql=${sql} params=${paramsTexto}`,
          ) as Error & { code?: string };
          if (base.code !== undefined) {
            error.code = base.code;
          }
          const clave = new URL(url).password;

          // Captura de todas las lineas registradas en el log de error.
          const lineasLog: string[] = [];
          jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation((mensaje: unknown) => {
              lineasLog.push(String(mensaje));
            });

          const query = jest.fn().mockRejectedValue(error);
          const poolFalso = { query, on: jest.fn(), end: jest.fn() };
          const crearPool: SoftrackerPoolFactory = () =>
            poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
          const service = new SoftrackerDbService(crearPool);

          let capturada: unknown;
          try {
            await service.consultar(sql, params);
            throw new Error('se esperaba que consultar rechazara');
          } catch (e) {
            capturada = e;
          }

          const esperaDisponibilidad = esErrorDeDisponibilidad(error);

          // Clase de excepcion y mensaje fijo segun la clasificacion.
          if (esperaDisponibilidad) {
            expect(capturada).toBeInstanceOf(ServiceUnavailableException);
            expect((capturada as Error).message).toBe(
              MENSAJE_SOFTRACKER_NO_DISPONIBLE,
            );
          } else {
            expect(capturada).toBeInstanceOf(InternalServerErrorException);
            expect((capturada as Error).message).toBe(
              MENSAJE_SOFTRACKER_ERROR_INTERNO,
            );
          }

          // El mensaje de la excepcion no revela la URL, la clave, el sql ni los params.
          const mensajeExcepcion = (capturada as Error).message;
          expect(mensajeExcepcion).not.toContain(url);
          expect(mensajeExcepcion).not.toContain(clave);
          expect(mensajeExcepcion).not.toContain(sql);
          if (params.length > 0) {
            expect(mensajeExcepcion).not.toContain(paramsTexto);
          }

          // Ninguna linea del log contiene la cadena de conexion ni la contrasena.
          expect(lineasLog.length).toBeGreaterThan(0);
          for (const linea of lineasLog) {
            expect(linea).not.toContain(url);
            expect(linea).not.toContain(clave);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: monitoreo-software-conexion-permisos, Property 4: el pool se crea
// una sola vez y solo al consultar; la fabrica se invoca min(n, 1) veces,
// siempre con la configuracion de construirConfigPool(url).
describe('Property 4', () => {
  const URL_VALIDA_P4 =
    'postgresql://softracker_readonly:clave@softracker-db:5432/softracker';

  let urlOriginalP4: string | undefined;

  beforeEach(() => {
    urlOriginalP4 = process.env.SOFTRACKER_DATABASE_URL;
    process.env.SOFTRACKER_DATABASE_URL = URL_VALIDA_P4;
  });

  afterEach(() => {
    if (urlOriginalP4 === undefined) {
      delete process.env.SOFTRACKER_DATABASE_URL;
    } else {
      process.env.SOFTRACKER_DATABASE_URL = urlOriginalP4;
    }
    jest.restoreAllMocks();
  });

  it('invoca la fabrica min(n, 1) veces con construirConfigPool(url)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.nat({ max: 20 }), async (n) => {
        // Fabrica fake que cuenta invocaciones y captura el config recibido.
        let invocacionesP4 = 0;
        const configsRecibidosP4: unknown[] = [];
        const poolFalsoP4 = {
          query: jest.fn().mockResolvedValue({ rows: [] }),
          on: jest.fn(),
          end: jest.fn(),
        };
        const crearPoolP4: SoftrackerPoolFactory = (config) => {
          invocacionesP4 += 1;
          configsRecibidosP4.push(config);
          return poolFalsoP4 as unknown as ReturnType<SoftrackerPoolFactory>;
        };

        const service = new SoftrackerDbService(crearPoolP4);

        for (let i = 0; i < n; i += 1) {
          await service.consultar('SELECT 1');
        }

        // La fabrica se invoca exactamente min(n, 1) veces.
        expect(invocacionesP4).toBe(Math.min(n, 1));

        if (n === 0) {
          expect(configsRecibidosP4).toHaveLength(0);
        } else {
          expect(configsRecibidosP4).toHaveLength(1);
          // El config pasado es igual a construirConfigPool(URL).
          expect(configsRecibidosP4[0]).toEqual(
            construirConfigPool(URL_VALIDA_P4),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: monitoreo-software-conexion-permisos, Property 5: sin URL
// configurada (ausente, vacia o solo espacios) consultar siempre rechaza con
// ServiceUnavailableException y nunca abre el pool.
describe('Property 5', () => {
  let urlOriginalP5: string | undefined;

  beforeEach(() => {
    urlOriginalP5 = process.env.SOFTRACKER_DATABASE_URL;
  });

  afterEach(() => {
    if (urlOriginalP5 === undefined) {
      delete process.env.SOFTRACKER_DATABASE_URL;
    } else {
      process.env.SOFTRACKER_DATABASE_URL = urlOriginalP5;
    }
    jest.restoreAllMocks();
  });

  it('rechaza con ServiceUnavailableException y no invoca la fabrica', async () => {
    // undefined = ausente; '' = vacia; cadena de solo espacios = solo-espacios.
    const arbUrlInvalidaP5 = fc.option(
      fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
      { nil: undefined },
    );

    await fc.assert(
      fc.asyncProperty(
        arbUrlInvalidaP5,
        fc.integer({ min: 1, max: 5 }),
        async (urlInvalida, n) => {
          if (urlInvalida === undefined) {
            delete process.env.SOFTRACKER_DATABASE_URL;
          } else {
            process.env.SOFTRACKER_DATABASE_URL = urlInvalida;
          }

          let invocacionesP5 = 0;
          const crearPoolP5: SoftrackerPoolFactory = () => {
            invocacionesP5 += 1;
            return {
              query: jest.fn().mockResolvedValue({ rows: [] }),
              on: jest.fn(),
              end: jest.fn(),
            } as unknown as ReturnType<SoftrackerPoolFactory>;
          };

          const service = new SoftrackerDbService(crearPoolP5);

          for (let i = 0; i < n; i += 1) {
            let capturadaP5: unknown;
            try {
              await service.consultar('SELECT 1');
              throw new Error('se esperaba que consultar rechazara');
            } catch (e) {
              capturadaP5 = e;
            }
            expect(capturadaP5).toBeInstanceOf(ServiceUnavailableException);
            expect((capturadaP5 as Error).message).toBe(
              MENSAJE_SOFTRACKER_NO_DISPONIBLE,
            );
          }

          // La fabrica nunca se invoca: el pool jamas se abre.
          expect(invocacionesP5).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: monitoreo-software-conexion-permisos: pruebas de ejemplo del
// servicio y de la configuracion del pool (no son property-based).
describe('SoftrackerDbService (ejemplos de servicio y configuracion del pool)', () => {
  const URL_VALIDA_EJ =
    'postgresql://softracker_readonly:clave@softracker-db:5432/softracker';

  let urlOriginalEj: string | undefined;

  beforeEach(() => {
    urlOriginalEj = process.env.SOFTRACKER_DATABASE_URL;
    process.env.SOFTRACKER_DATABASE_URL = URL_VALIDA_EJ;
  });

  afterEach(() => {
    if (urlOriginalEj === undefined) {
      delete process.env.SOFTRACKER_DATABASE_URL;
    } else {
      process.env.SOFTRACKER_DATABASE_URL = urlOriginalEj;
    }
    jest.restoreAllMocks();
  });

  function crearPoolFalsoEj(overrides: {
    query?: jest.Mock;
    end?: jest.Mock;
    on?: jest.Mock;
  }) {
    return {
      query: overrides.query ?? jest.fn().mockResolvedValue({ rows: [] }),
      on: overrides.on ?? jest.fn(),
      end: overrides.end ?? jest.fn().mockResolvedValue(undefined),
    };
  }

  it('construirConfigPool devuelve exactamente la configuracion del diseno', () => {
    expect(construirConfigPool(URL_VALIDA_EJ)).toEqual({
      connectionString: URL_VALIDA_EJ,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      application_name: 'gestion-aulas',
      options: '-c default_transaction_read_only=on',
    });
  });

  it('registra un listener "error" en el pool en la primera consulta exitosa', async () => {
    const on = jest.fn();
    const poolFalso = crearPoolFalsoEj({ on });
    const crearPool: SoftrackerPoolFactory = () =>
      poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
    const service = new SoftrackerDbService(crearPool);

    await service.consultar('SELECT 1');

    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('onModuleDestroy sin pool no lanza ni llama end()', async () => {
    const end = jest.fn().mockResolvedValue(undefined);
    const poolFalso = crearPoolFalsoEj({ end });
    const crearPool: SoftrackerPoolFactory = () =>
      poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
    const service = new SoftrackerDbService(crearPool);

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(end).not.toHaveBeenCalled();
  });

  it('onModuleDestroy con pool (tras una consulta) llama end() una vez', async () => {
    const end = jest.fn().mockResolvedValue(undefined);
    const poolFalso = crearPoolFalsoEj({ end });
    const crearPool: SoftrackerPoolFactory = () =>
      poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
    const service = new SoftrackerDbService(crearPool);

    await service.consultar('SELECT 1');
    await service.onModuleDestroy();

    expect(end).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy no lanza aunque end() rechace', async () => {
    const end = jest.fn().mockRejectedValue(new Error('fallo al cerrar'));
    const poolFalso = crearPoolFalsoEj({ end });
    const crearPool: SoftrackerPoolFactory = () =>
      poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
    const service = new SoftrackerDbService(crearPool);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await service.consultar('SELECT 1');

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('clasifica el error con code "25006" como InternalServerErrorException', async () => {
    const error = Object.assign(new Error('db error'), { code: '25006' });
    const poolFalso = crearPoolFalsoEj({
      query: jest.fn().mockRejectedValue(error),
    });
    const crearPool: SoftrackerPoolFactory = () =>
      poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
    const service = new SoftrackerDbService(crearPool);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.consultar('SELECT 1')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('clasifica el mensaje "timeout exceeded when trying to connect" como ServiceUnavailableException', async () => {
    const error = new Error('timeout exceeded when trying to connect');
    const poolFalso = crearPoolFalsoEj({
      query: jest.fn().mockRejectedValue(error),
    });
    const crearPool: SoftrackerPoolFactory = () =>
      poolFalso as unknown as ReturnType<SoftrackerPoolFactory>;
    const service = new SoftrackerDbService(crearPool);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.consultar('SELECT 1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
