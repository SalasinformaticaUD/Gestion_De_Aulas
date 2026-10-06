"use client";

import { useCallback, useMemo, useState } from "react";

function usePaginacion<T>(elementos: T[], tamano = 8) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / tamano));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(() => elementos.slice((paginaSegura - 1) * tamano, paginaSegura * tamano), [elementos, paginaSegura, tamano]);
  const anterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const siguiente = useCallback(() => setPagina((valor) => Math.min(totalPaginas, valor + 1)), [totalPaginas]);
  const reiniciar = useCallback(() => setPagina(1), []);
  const irA = useCallback((valor: number) => setPagina(valor), []);
  return {
    pagina: paginaSegura,
    totalPaginas,
    visibles,
    anterior,
    siguiente,
    reiniciar,
    irA,
  };
}

export { usePaginacion as usarPaginacion };
