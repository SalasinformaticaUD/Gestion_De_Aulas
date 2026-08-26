"use client";

import { useCallback, useEffect, useState } from "react";

function useRecursoApi<T>(cargar: () => Promise<T>, valorInicial: T) {
  const [datos, setDatos] = useState<T>(valorInicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setDatos(await cargar());
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No fue posible consultar la información.");
    } finally {
      setCargando(false);
    }
  }, [cargar]);

  useEffect(() => { void recargar(); }, [recargar]);
  return { datos, setDatos, cargando, error, recargar };
}

export { useRecursoApi as usarRecursoApi };
