// Funciones puras para construir la respuesta del endpoint de filtros a partir
// de las filas crudas leídas de Softracker. El orden y la deduplicación se hacen
// aquí (no en SQL) para no depender de la collation de PostgreSQL y así obtener
// un contrato verificable y estable entre entornos.

import {
  FilaAula,
  FilaCategoria,
  FilaSoftware,
  RespuestaFiltros,
  SoftwareFiltro,
} from './monitoreo-software.types';

/**
 * Comparador de texto total por unidades de código UTF-16.
 *
 * Se prefiere a `localeCompare` porque es total, estable entre entornos y no
 * depende de ICU. Para los códigos de aula (`^\d{3}$`) coincide con el orden
 * numérico.
 *
 * @returns -1 si `a < b`, 1 si `a > b`, 0 si son iguales.
 */
export function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Normaliza una lista de valores de texto: descarta los que no son `string` no
 * vacío tras `trim()`, deduplica con `Set` y ordena con `compararTexto`.
 */
function normalizarTextos(valores: Array<string | null | undefined>): string[] {
  const unicos = new Set<string>();
  for (const valor of valores) {
    if (typeof valor === 'string' && valor.trim() !== '') {
      unicos.add(valor);
    }
  }
  return Array.from(unicos).sort(compararTexto);
}

/**
 * Construye la respuesta del endpoint de filtros a partir de las filas crudas.
 *
 * Reglas:
 * - `aulas`: toma `sala_codigo`, descarta `null`/`undefined`/no-string y valores
 *   cuyo `trim()` es vacío; deduplica y ordena con `compararTexto` (Req. 4.4).
 * - `software`: descarta filas sin `id` string no vacío o sin `nombre` string;
 *   conserva la primera fila por `id`; ordena por `nombre` y luego por `id`
 *   (Req. 4.5). `categoria` se conserva tal cual.
 * - `categorias`: igual que `aulas` sobre `categoria` (Req. 4.6).
 * - El resultado contiene exactamente `aulas`, `software`, `categorias` y
 *   `generadoEn` (Req. 4.3).
 */
export function construirRespuestaFiltros(
  filas: {
    aulas: FilaAula[];
    software: FilaSoftware[];
    categorias: FilaCategoria[];
  },
  generadoEn: string,
): RespuestaFiltros {
  const aulas = normalizarTextos(filas.aulas.map((fila) => fila.sala_codigo));
  const categorias = normalizarTextos(
    filas.categorias.map((fila) => fila.categoria),
  );

  const porId = new Map<string, SoftwareFiltro>();
  for (const fila of filas.software) {
    if (
      typeof fila.id === 'string' &&
      fila.id.trim() !== '' &&
      typeof fila.nombre === 'string'
    ) {
      if (!porId.has(fila.id)) {
        porId.set(fila.id, {
          id: fila.id,
          nombre: fila.nombre,
          categoria: fila.categoria,
        });
      }
    }
  }
  const software = Array.from(porId.values()).sort((a, b) => {
    const porNombre = compararTexto(a.nombre, b.nombre);
    return porNombre !== 0 ? porNombre : compararTexto(a.id, b.id);
  });

  return { aulas, software, categorias, generadoEn };
}
