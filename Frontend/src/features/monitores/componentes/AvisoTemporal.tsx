"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "./SistemaVisualMonitores.module.css";

type Props = {
  mensaje: string;
  tipo: "error" | "exito";
  alCerrar: () => void;
};

/** Aviso que se oculta a los diez segundos y se conserva mientras se inspecciona con el cursor. */
export function AvisoTemporal({ mensaje, tipo, alCerrar }: Props) {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisoDesvanecer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limite = useRef(0);
  const pausado = useRef(false);
  const cerrarActual = useRef(alCerrar);
  const [desvaneciendo, setDesvaneciendo] = useState(false);
  cerrarActual.current = alCerrar;

  const cancelar = () => { if (temporizador.current) { clearTimeout(temporizador.current); temporizador.current = null; } if (avisoDesvanecer.current) { clearTimeout(avisoDesvanecer.current); avisoDesvanecer.current = null; } };
  const salidaEnTresSegundos = () => {
    setDesvaneciendo(true);
    cancelar();
    temporizador.current = setTimeout(() => cerrarActual.current(), 3_000);
  };
  const programar = () => {
    cancelar();
    const restante = limite.current - Date.now();
    if (restante <= 0) { salidaEnTresSegundos(); return; }
    if (restante <= 3_000) setDesvaneciendo(true);
    else avisoDesvanecer.current = setTimeout(() => { if (!pausado.current) setDesvaneciendo(true); }, restante - 3_000);
    temporizador.current = setTimeout(() => { if (!pausado.current) cerrarActual.current(); }, restante);
  };

  useEffect(() => {
    limite.current = Date.now() + 10_000;
    pausado.current = false;
    setDesvaneciendo(false);
    programar();
    return cancelar;
  }, [mensaje]);

  return <div className={`${estilos.aviso} ${tipo === "error" ? estilos.avisoError : estilos.avisoExito} ${estilos.avisoTemporal} ${desvaneciendo ? estilos.avisoDesvaneciendo : ""}`} role={tipo === "error" ? "alert" : "status"} onMouseEnter={() => { pausado.current = true; cancelar(); setDesvaneciendo(false); }} onMouseLeave={() => { pausado.current = false; programar(); }}>{mensaje}</div>;
}
