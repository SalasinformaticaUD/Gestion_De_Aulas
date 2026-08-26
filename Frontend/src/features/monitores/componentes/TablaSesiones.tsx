"use client";
import type { SesionMonitor } from "@/features/monitores/tipos/modelosMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { Paginacion } from "./Paginacion";
import estilos from "./SistemaVisualMonitores.module.css";

const etiquetas = { PENDIENTE:"Pendiente", APROBADA:"Aprobada", RECHAZADA:"Rechazada", NO_APLICA:"No aplica" } as const;
export function TablaSesiones({ sesiones }: { sesiones:SesionMonitor[] }) {
  const paginacion = usarPaginacion(sesiones, 8);
  return <section className={estilos.tarjeta}><header><div><h2>Historial reciente</h2><p>Entradas, salidas, horas de turno y novedades calculadas.</p></div></header><div className={estilos.guia}><strong>Guía rápida:</strong> “Normales” son horas dentro del turno; “Extra” son horas fuera del turno; “Retraso” compara la entrada con el inicio esperado. “Exento” indica una excepción activa.</div><div className={estilos.tablaContenedor}><table className={estilos.tabla}><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Normales</th><th>Extra</th><th>Retraso</th><th>Estado extra</th></tr></thead><tbody>{paginacion.visibles.map((sesion) => <tr key={sesion.id}><td><strong>{sesion.fecha}</strong></td><td>{sesion.entrada}</td><td>{sesion.salida}</td><td>{sesion.horasNormales.toFixed(1)} h</td><td>{sesion.horasExtra.toFixed(1)} h</td><td>{sesion.horasRetraso.toFixed(1)} h {sesion.retrasoExento && <span className={`${estilos.insignia} ${estilos.informacion}`}>Exento</span>}</td><td><span className={`${estilos.insignia} ${sesion.estadoExtra === "APROBADA" ? estilos.exito : sesion.estadoExtra === "PENDIENTE" ? estilos.advertencia : sesion.estadoExtra === "RECHAZADA" ? estilos.peligro : estilos.neutro}`}>{etiquetas[sesion.estadoExtra]}</span>{sesion.excepcion && <small>{sesion.excepcion}</small>}</td></tr>)}</tbody></table></div><Paginacion {...paginacion} total={sesiones.length} /></section>;
}
