"use client";

import { useMemo, useState } from "react";

function usePaginacion<T>(elementos: T[], tamano = 8) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / tamano));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(() => elementos.slice((paginaSegura - 1) * tamano, paginaSegura * tamano), [elementos, paginaSegura, tamano]);
  return {
    pagina: paginaSegura,
    totalPaginas,
    visibles,
    anterior: () => setPagina((valor) => Math.max(1, valor - 1)),
    siguiente: () => setPagina((valor) => Math.min(totalPaginas, valor + 1)),
    reiniciar: () => setPagina(1),
  };
}

export { usePaginacion as usarPaginacion };
