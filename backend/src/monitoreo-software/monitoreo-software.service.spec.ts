import { ServiceUnavailableException } from '@nestjs/common';
import fc from 'fast-check';

import { RelojMonitoreo, TTL_FILTROS_MS } from './monitoreo-software.constants';
import { MonitoreoSoftwareService } from './monitoreo-software.service';
import { SoftrackerDbService } from '../softracker-db/softracker-db.service';

// Promesa controlable: expone resolve/reject para disparar varias solicitudes
// concurrentes antes de que termine la primera ronda de consultas.
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (valor: T) => void;
  reject: (error: unknown) => void;
}

function crearDeferred<T>(): Deferred<T> {
  let resolve!: (valor: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Feature: monitoreo-software-conexion-permisos, Property 9: Caché secuencial de
// filtros conforme al modelo. Para una secuencia de solicitudes con instantes no
// decrecientes (incluidos instantes exactamente iguales a `expiraEn`) y, por
// ronda, éxito o fallo de una cualquiera de las tres consultas, resolviendo cada
// solicitud antes de la siguiente: el número de rondas de consulta a Softracker
// coincide con el modelo "consultar si no hay entrada o `expiraEn <= ahora`;
// tras éxito guardar `expiraEn = ahora_ronda + 3_600_000`; tras fallo no
// guardar"; cada ronda invoca `consultar` exactamente 3 veces; cada solicitud
// servida desde caché resuelve con el MISMO valor de la ronda que creó la
// entrada (incluido `generadoEn == new Date(ahora_ronda).toISOString()`); y cada
// solicitud de una ronda fallida rechaza con el error de esa ronda sin respuesta
// parcial.
describe('Property 9', () => {
  // Resultado por solicitud: éxito, o fallo en una de las tres consultas.
  type ResultadoRonda =
    | { tipo: 'exito' }
    | { tipo: 'fallo'; indice: 0 | 1 | 2; error: 'disponible' | 'interno' };

  // Deltas que incluyen 0 (mismo instante), justo antes del TTL (3_599_999),
  // exactamente el TTL (3_600_000 => expiraEn == ahora, debe reconsultar) y
  // mayores.
  const arbDelta: fc.Arbitrary<number> = fc.oneof(
    fc.constantFrom(0, 3_599_999, 3_600_000, 3_600_001),
    fc.integer({ min: 0, max: 10_000_000 }),
  );

  const arbResultado: fc.Arbitrary<ResultadoRonda> = fc.oneof(
    fc.constant<ResultadoRonda>({ tipo: 'exito' }),
    fc.record({
      tipo: fc.constant<'fallo'>('fallo'),
      indice: fc.constantFrom<0 | 1 | 2>(0, 1, 2),
      error: fc.constantFrom<'disponible' | 'interno'>('disponible', 'interno'),
    }),
  );

  // Una solicitud = un delta respecto a la anterior (instantes no decrecientes)
  // + el resultado de la ronda que ocurriría si esta solicitud consulta.
  const arbSolicitud = fc.record({
    delta: arbDelta,
    resultado: arbResultado,
  });

  it('sigue el modelo de caché secuencial para toda secuencia de solicitudes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbSolicitud, { minLength: 1, maxLength: 25 }),
        async (solicitudes) => {
          const consultar = jest.fn();
          const softrackerFake = {
            consultar,
          } as unknown as SoftrackerDbService;

          let ahora = 0;
          const reloj: RelojMonitoreo = () => ahora;
          const service = new MonitoreoSoftwareService(softrackerFake, reloj);

          // Modelo de referencia: réplica independiente de la lógica de caché.
          let modeloExpiraEn: number | null = null; // null => sin entrada vigente
          let modeloGeneradoEnRonda: string | null = null; // generadoEn de la entrada

          let rondasEsperadas = 0;
          let ahoraPrevio = 0;

          for (let i = 0; i < solicitudes.length; i += 1) {
            const { delta, resultado } = solicitudes[i];
            ahora = ahoraPrevio + delta;
            ahoraPrevio = ahora;

            // ¿El modelo predice que esta solicitud dispara una nueva ronda?
            const hayEntradaVigente =
              modeloExpiraEn !== null && modeloExpiraEn > ahora;

            const llamadasPrevias = consultar.mock.calls.length;

            if (!hayEntradaVigente) {
              // Nueva ronda: configurar el mock para las 3 consultas de la ronda.
              rondasEsperadas += 1;
              const generadoEnRonda = new Date(ahora).toISOString();

              if (resultado.tipo === 'exito') {
                consultar.mockImplementation(() => Promise.resolve([]));
              } else {
                const error =
                  resultado.error === 'disponible'
                    ? new ServiceUnavailableException('no disponible')
                    : new Error('interno');
                // La consulta en `indice` falla; las otras resuelven con [].
                let llamada = -1;
                consultar.mockImplementation(() => {
                  llamada += 1;
                  return llamada === resultado.indice
                    ? Promise.reject(error)
                    : Promise.resolve([]);
                });

                let errorCapturado: unknown;
                try {
                  await service.obtenerFiltros();
                  throw new Error('se esperaba rechazo');
                } catch (e) {
                  errorCapturado = e;
                }
                // Rechaza con el error de esa ronda, sin respuesta parcial.
                expect(errorCapturado).toBe(error);

                // Cada ronda invoca consultar exactamente 3 veces.
                expect(consultar.mock.calls.length - llamadasPrevias).toBe(3);

                // Tras fallo no se guarda nada en el modelo.
                modeloExpiraEn = null;
                modeloGeneradoEnRonda = null;
                expect(consultar.mock.calls.length).toBe(rondasEsperadas * 3);
                continue;
              }

              // Ronda exitosa.
              const respuesta = await service.obtenerFiltros();
              expect(consultar.mock.calls.length - llamadasPrevias).toBe(3);
              expect(respuesta.generadoEn).toBe(generadoEnRonda);
              expect(respuesta).toEqual({
                aulas: [],
                software: [],
                categorias: [],
                generadoEn: generadoEnRonda,
              });

              // El modelo guarda la nueva entrada.
              modeloExpiraEn = ahora + TTL_FILTROS_MS;
              modeloGeneradoEnRonda = generadoEnRonda;
            } else {
              // Servida desde caché: no debe invocar consultar de nuevo.
              const respuesta = await service.obtenerFiltros();
              expect(consultar.mock.calls.length - llamadasPrevias).toBe(0);
              // Resuelve con el MISMO valor de la ronda que creó la entrada.
              expect(respuesta.generadoEn).toBe(modeloGeneradoEnRonda);
              expect(respuesta).toEqual({
                aulas: [],
                software: [],
                categorias: [],
                generadoEn: modeloGeneradoEnRonda,
              });
            }

            // El total de invocaciones coincide con rondas * 3 en todo momento.
            expect(consultar.mock.calls.length).toBe(rondasEsperadas * 3);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: monitoreo-software-conexion-permisos, Property 10: Solicitudes
// simultáneas comparten una sola consulta. Para n >= 2 solicitudes emitidas
// antes de que termine la primera ronda (sin entrada vigente) y, para cualquier
// resultado de esa ronda (éxito o fallo), se ejecuta UNA sola ronda (3
// invocaciones de `consultar`), todas las solicitudes resuelven con el mismo
// objeto (misma referencia) o rechazan con el mismo error, y tras un fallo la
// siguiente solicitud ejecuta una nueva ronda.
describe('Property 10', () => {
  it('comparte una sola ronda entre solicitudes simultáneas', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        fc.boolean(), // true => éxito, false => fallo
        async (n, exito) => {
          // Deferreds controlables: una por cada consulta de la primera ronda.
          const deferreds: Array<Deferred<unknown[]>> = [];
          const consultar = jest.fn(() => {
            const d = crearDeferred<unknown[]>();
            deferreds.push(d);
            return d.promise;
          });
          const softrackerFake = {
            consultar,
          } as unknown as SoftrackerDbService;

          const ahora = 1_000;
          const reloj: RelojMonitoreo = () => ahora;
          const service = new MonitoreoSoftwareService(softrackerFake, reloj);

          // Disparar n solicitudes ANTES de resolver cualquier consulta.
          const promesas = Array.from({ length: n }, () =>
            service.obtenerFiltros(),
          );
          // Evitar rechazos no manejados mientras preparamos la resolución.
          const resultados = promesas.map((p) =>
            p.then(
              (valor) => ({ ok: true as const, valor }),
              (error: unknown) => ({ ok: false as const, error }),
            ),
          );

          // Dar una vuelta de microtareas para que arranque la ronda única.
          await Promise.resolve();

          // Una sola ronda => exactamente 3 invocaciones de consultar.
          expect(consultar).toHaveBeenCalledTimes(3);
          expect(deferreds.length).toBe(3);

          const error = new ServiceUnavailableException('no disponible');
          if (exito) {
            deferreds.forEach((d) => d.resolve([]));
          } else {
            // Una consulta falla; las demás resuelven.
            deferreds[0].reject(error);
            deferreds[1].resolve([]);
            deferreds[2].resolve([]);
          }

          const settled = await Promise.all(resultados);

          if (exito) {
            // Todas resuelven con el MISMO objeto (misma referencia).
            const primera = settled[0];
            expect(primera.ok).toBe(true);
            for (const r of settled) {
              expect(r.ok).toBe(true);
              if (r.ok && primera.ok) {
                expect(r.valor).toBe(primera.valor);
              }
            }
          } else {
            // Todas rechazan con el MISMO error.
            for (const r of settled) {
              expect(r.ok).toBe(false);
              if (!r.ok) {
                expect(r.error).toBe(error);
              }
            }

            // Tras el fallo, la siguiente solicitud ejecuta una nueva ronda.
            const deferreds2: Array<Deferred<unknown[]>> = [];
            consultar.mockImplementation(() => {
              const d = crearDeferred<unknown[]>();
              deferreds2.push(d);
              return d.promise;
            });
            const segunda = service.obtenerFiltros().then(
              (valor) => ({ ok: true as const, valor }),
              (err: unknown) => ({ ok: false as const, error: err }),
            );
            await Promise.resolve();
            expect(deferreds2.length).toBe(3);
            expect(consultar).toHaveBeenCalledTimes(6);
            deferreds2.forEach((d) => d.resolve([]));
            const r2 = await segunda;
            expect(r2.ok).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Ejemplos del servicio de monitoreo (Requirements 4.8, 4.9, 4.15, 6.5).
describe('MonitoreoSoftwareService (ejemplos)', () => {
  function montar() {
    const consultar = jest.fn<
      Promise<unknown[]>,
      [string, readonly unknown[]?]
    >();
    const softrackerFake = {
      consultar,
    } as unknown as SoftrackerDbService;
    let ahora = 0;
    const reloj: RelojMonitoreo = () => ahora;
    const service = new MonitoreoSoftwareService(softrackerFake, reloj);
    return {
      consultar,
      service,
      setAhora: (valor: number) => {
        ahora = valor;
      },
    };
  }

  it('envía tres SELECT parametrizados sobre las vistas esperadas con los parámetros correctos', async () => {
    const { consultar, service, setAhora } = montar();
    consultar.mockResolvedValue([]);
    setAhora(1_700_000_000_000);

    await service.obtenerFiltros();

    expect(consultar).toHaveBeenCalledTimes(3);

    // Orden del Promise.all: aulas, software, categorias.
    const [llamadaAulas, llamadaSoftware, llamadaCategorias] =
      consultar.mock.calls;

    const sqls: string[] = [
      llamadaAulas[0],
      llamadaSoftware[0],
      llamadaCategorias[0],
    ];

    for (const sql of sqls) {
      // Empiezan por SELECT.
      expect(sql.trimStart().startsWith('SELECT')).toBe(true);
      // Solo nombran resumen_diario_uso o software_catalogo (sin otras tablas).
      const tablas = [...sql.matchAll(/\bFROM\s+(\w+)/gi)].map((m) => m[1]);
      expect(tablas.length).toBeGreaterThan(0);
      for (const tabla of tablas) {
        expect(['resumen_diario_uso', 'software_catalogo']).toContain(tabla);
      }
    }

    // Parámetros: [], ['ACTIVO'], ['ACTIVO'].
    expect(llamadaAulas[1]).toEqual([]);
    expect(llamadaSoftware[1]).toEqual(['ACTIVO']);
    expect(llamadaCategorias[1]).toEqual(['ACTIVO']);
  });

  it('con vistas vacías devuelve listas vacías y generadoEn del instante actual', async () => {
    const { consultar, service, setAhora } = montar();
    consultar.mockResolvedValue([]);
    const ahora = 1_700_000_000_000;
    setAhora(ahora);

    const respuesta = await service.obtenerFiltros();

    expect(respuesta).toEqual({
      aulas: [],
      software: [],
      categorias: [],
      generadoEn: new Date(ahora).toISOString(),
    });
  });

  it('reutiliza la respuesta vigente en una segunda solicitud sin volver a consultar', async () => {
    const { consultar, service, setAhora } = montar();
    consultar.mockResolvedValue([]);
    const ahora = 1_700_000_000_000;
    setAhora(ahora);

    const primera = await service.obtenerFiltros();
    // Segunda solicitud dentro del TTL (mismo instante).
    const segunda = await service.obtenerFiltros();

    expect(segunda).toBe(primera);
    expect(consultar).toHaveBeenCalledTimes(3);
  });
});
