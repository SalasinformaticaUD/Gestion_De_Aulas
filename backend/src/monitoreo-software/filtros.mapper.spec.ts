import fc from 'fast-check';

import { compararTexto, construirRespuestaFiltros } from './filtros.mapper';
import { FilaCategoria, FilaSoftware } from './monitoreo-software.types';

// Feature: monitoreo-software-conexion-permisos, Property 8: Software sin `id`
// repetido y ordenado por nombre e `id`. Para cualquier lista de filas de
// software (con `id` y `nombre` repetidos, en cualquier orden), la lista
// `software` de la respuesta contiene cada `id` válido de la entrada exactamente
// una vez, cada elemento corresponde a la PRIMERA fila de la entrada con ese
// `id`, y todo par consecutivo `(a, b)` cumple el orden `(nombre, id)` con
// `compararTexto`.
describe('Property 8', () => {
  // Alfabetos pequeños para forzar repeticiones de `id` y `nombre`.
  const ALFABETO_P8 = ['a', 'b', 'c'] as const;

  // Fila válida: `id` y `nombre` string de alfabeto pequeño, `categoria`
  // opcional (string | null).
  const arbFilaValidaP8: fc.Arbitrary<FilaSoftware> = fc.record({
    id: fc.constantFrom(...ALFABETO_P8),
    nombre: fc.constantFrom(...ALFABETO_P8),
    categoria: fc.option(fc.string(), { nil: null }),
  });

  // Fila inválida: debe descartarse (id vacío/solo-espacios/no-string, o
  // nombre no-string). Se castea a FilaSoftware para poder mezclar valores que
  // violan el contrato nominal, igual que llegarían desde una vista cruda.
  const arbFilaInvalidaP8: fc.Arbitrary<FilaSoftware> = fc.oneof(
    // id vacío o solo espacios
    fc.record({
      id: fc.constantFrom('', '   '),
      nombre: fc.constantFrom(...ALFABETO_P8),
      categoria: fc.option(fc.string(), { nil: null }),
    }),
    // id no-string
    fc.record({
      id: fc.constantFrom(null, undefined, 123),
      nombre: fc.constantFrom(...ALFABETO_P8),
      categoria: fc.option(fc.string(), { nil: null }),
    }) as unknown as fc.Arbitrary<FilaSoftware>,
    // nombre no-string (id válido)
    fc.record({
      id: fc.constantFrom(...ALFABETO_P8),
      nombre: fc.constantFrom(null, undefined, 42),
      categoria: fc.option(fc.string(), { nil: null }),
    }) as unknown as fc.Arbitrary<FilaSoftware>,
  );

  const arbFilaP8: fc.Arbitrary<FilaSoftware> = fc.oneof(
    { weight: 3, arbitrary: arbFilaValidaP8 },
    { weight: 1, arbitrary: arbFilaInvalidaP8 },
  );

  // Predicado de validez usado por el mapper (según diseño): `id` string no
  // vacío tras trim y `nombre` string.
  const esFilaValidaP8 = (fila: FilaSoftware): boolean =>
    typeof fila.id === 'string' &&
    fila.id.trim() !== '' &&
    typeof fila.nombre === 'string';

  it('deduplica software por id (primera fila) y ordena por (nombre, id)', () => {
    fc.assert(
      fc.property(fc.array(arbFilaP8, { maxLength: 40 }), (filasSoftware) => {
        const generadoEn = '2026-10-07T14:05:00.000Z';
        const { software } = construirRespuestaFiltros(
          { aulas: [], software: filasSoftware, categorias: [] },
          generadoEn,
        );

        // ids válidos esperados (en orden de aparición) y su primera fila.
        const primeraPorId = new Map<string, FilaSoftware>();
        for (const fila of filasSoftware) {
          if (esFilaValidaP8(fila) && !primeraPorId.has(fila.id)) {
            primeraPorId.set(fila.id, fila);
          }
        }
        const idsValidosUnicos = Array.from(primeraPorId.keys());

        // 1) Cada id válido aparece exactamente una vez; sin ids extra ni
        //    filas inválidas conservadas.
        const idsSalida = software.map((s) => s.id);
        expect(new Set(idsSalida).size).toBe(idsSalida.length);
        expect([...idsSalida].sort()).toEqual([...idsValidosUnicos].sort());

        // 2) Cada elemento corresponde a la PRIMERA fila de la entrada con ese
        //    id (nombre y categoria conservados).
        for (const elemento of software) {
          const origen = primeraPorId.get(elemento.id);
          expect(origen).toBeDefined();
          expect(elemento.nombre).toBe(origen!.nombre);
          expect(elemento.categoria).toBe(origen!.categoria);
        }

        // 3) Orden estrictamente creciente por (nombre, id) con compararTexto.
        for (let i = 1; i < software.length; i += 1) {
          const a = software[i - 1];
          const b = software[i];
          const porNombre = compararTexto(a.nombre, b.nombre);
          const estrictamenteOrdenado =
            porNombre < 0 ||
            (a.nombre === b.nombre && compararTexto(a.id, b.id) < 0);
          expect(estrictamenteOrdenado).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: monitoreo-software-conexion-permisos, Property 7: Normalización de
// aulas y categorías y forma de la respuesta. Para cualquier lista de filas de
// aulas y de categorías con valores arbitrarios (cadenas, vacías, solo
// espacios, null, duplicados, incluidas listas vacías),
// `construirRespuestaFiltros` devuelve un objeto con exactamente las claves
// `aulas`, `software`, `categorias` y `generadoEn`, donde `aulas` (y
// respectivamente `categorias`) es igual al conjunto de valores de entrada que
// son cadenas con contenido distinto de espacios, sin repetidos y en orden
// estrictamente ascendente según `compararTexto`.
describe('Property 7', () => {
  // Generador de valores arbitrarios para columnas de texto: cadenas
  // arbitrarias, cadenas vacías, cadenas de solo espacios, códigos de aula
  // realistas (incluidas variantes con espacios para forzar casos de trim) y
  // `null`. Cubre todos los casos exigidos por la propiedad.
  const valorTextoP7 = (): fc.Arbitrary<string | null> =>
    fc.option(
      fc.oneof(
        fc.string(),
        fc.constantFrom('', '  ', '306', '412', ' 306', '306 '),
      ),
      { nil: null },
    );

  // Modelo de referencia independiente de la implementación: conserva las
  // cadenas con contenido distinto de espacios, deduplica por valor exacto y
  // ordena de forma estrictamente ascendente con `compararTexto`.
  const normalizacionEsperadaP7 = (valores: Array<string | null>): string[] => {
    const unicos = new Set<string>();
    for (const valor of valores) {
      if (typeof valor === 'string' && valor.trim() !== '') {
        unicos.add(valor);
      }
    }
    return Array.from(unicos).sort(compararTexto);
  };

  it('devuelve exactamente {aulas, software, categorias, generadoEn} con aulas/categorias normalizadas', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ sala_codigo: valorTextoP7() })),
        fc.array(fc.record<FilaCategoria>({ categoria: valorTextoP7() })),
        // `software` puede ir vacío o con filas simples; no es el foco de P7.
        fc.array(
          fc.record<FilaSoftware>({
            id: fc.constantFrom('s1', 's2', 's3'),
            nombre: fc.string(),
            categoria: valorTextoP7(),
          }),
        ),
        fc.date().map((d) => d.toISOString()),
        (aulasFilas, categoriasFilas, softwareFilas, generadoEn) => {
          const respuesta = construirRespuestaFiltros(
            {
              aulas: aulasFilas,
              categorias: categoriasFilas,
              software: softwareFilas,
            },
            generadoEn,
          );

          // Claves exactas: ni más ni menos que las cuatro esperadas.
          expect(Object.keys(respuesta).sort()).toEqual([
            'aulas',
            'categorias',
            'generadoEn',
            'software',
          ]);

          // `generadoEn` se pasa igual, sin alterarlo.
          expect(respuesta.generadoEn).toBe(generadoEn);

          for (const campo of ['aulas', 'categorias'] as const) {
            const salida = respuesta[campo];
            const entrada =
              campo === 'aulas'
                ? aulasFilas.map((f) => f.sala_codigo)
                : categoriasFilas.map((f) => f.categoria);
            const entradaValida = entrada.filter(
              (v): v is string => typeof v === 'string' && v.trim() !== '',
            );

            // Sin vacíos ni cadenas de solo espacios.
            for (const v of salida) {
              expect(typeof v).toBe('string');
              expect(v.trim()).not.toBe('');
            }

            // Sin duplicados.
            expect(new Set(salida).size).toBe(salida.length);

            // Orden estrictamente ascendente según `compararTexto`.
            for (let i = 1; i < salida.length; i += 1) {
              expect(compararTexto(salida[i - 1], salida[i])).toBeLessThan(0);
            }

            // Cada elemento proviene de la entrada válida.
            for (const v of salida) {
              expect(entradaValida).toContain(v);
            }

            // Igual al conjunto esperado (deduplicado y ordenado).
            expect(salida).toEqual(normalizacionEsperadaP7(entrada));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
