import type { Monitor } from "@/features/monitores/tipos/modelosMonitores";
import estilos from "../SistemaVisualMonitores.module.css";

export function FichaMonitor({ monitor }: { monitor: Monitor }) {
  return <section className={`${estilos.tarjeta} ${estilos.fichaMonitor}`}><div><h2>{monitor.nombre}</h2><dl><div><dt>Semestre académico</dt><dd>2026-3</dd></div><div><dt>Código</dt><dd>{monitor.codigo}</dd></div><div><dt>Dependencia</dt><dd>{monitor.dependencia}</dd></div></dl></div><span className={`${estilos.insignia} ${monitor.activo ? estilos.exito : estilos.neutro}`}>{monitor.activo ? "Monitor activo" : "Monitor inactivo"}</span></section>;
}
