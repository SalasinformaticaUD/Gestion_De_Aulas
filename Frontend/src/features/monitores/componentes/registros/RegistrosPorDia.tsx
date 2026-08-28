"use client";

import { useMemo, useState } from "react";
import type { SesionMonitor } from "@/features/monitores/tipos/modelosMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { Paginacion } from "../Paginacion";
import estilos from "../SistemaVisualMonitores.module.css";

const etiquetas = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada", NO_APLICA: "No aplica" } as const;

export function RegistrosPorDia({ sesiones }: { sesiones: SesionMonitor[] }) {
  const dias = useMemo(() => Object.entries(sesiones.reduce<Record<string, SesionMonitor[]>>((acumulado, sesion) => ({ ...acumulado, [sesion.fecha]: [...(acumulado[sesion.fecha] ?? []), sesion] }), {})).sort(([a], [b]) => b.localeCompare(a)), [sesiones]);
  const paginacion = usarPaginacion(dias, 6);
  const [abierto, setAbierto] = useState<string | null>(null);

  return <section className={`${estilos.tarjeta} ${estilos.registrosPorDia}`}><header><div><h2>Registros por día</h2><p>{dias.length} días con registros.</p></div></header><p className={estilos.guia}><strong>Guía rápida:</strong> abre el día para ver una sola línea multinivel con todas las marcaciones de esa fecha.</p><div className={estilos.listaDias}>{paginacion.visibles.map(([fecha, registros]) => <article className={estilos.diaRegistro} key={fecha}><button type="button" onClick={() => setAbierto((actual) => actual === fecha ? null : fecha)} aria-expanded={abierto === fecha}><span><strong>{fecha}</strong><small>{registros.length} marcación{registros.length === 1 ? "" : "es"}</small></span><span aria-hidden="true">{abierto === fecha ? "▾" : "▸"}</span></button>{abierto === fecha && <div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaRegistrosDia}`}><thead><tr><th>Entrada</th><th>Salida</th><th>Normales</th><th>Extra</th><th>Retraso</th><th>Estado extra</th></tr></thead><tbody>{registros.map((registro) => <tr key={registro.id}><td>{registro.entrada}</td><td>{registro.salida}</td><td>{registro.horasNormales.toFixed(1)} h</td><td>{registro.horasExtra.toFixed(1)} h</td><td>{registro.horasRetraso.toFixed(1)} h {registro.retrasoExento && <span className={`${estilos.insignia} ${estilos.informacion}`}>Exento</span>}</td><td><span className={`${estilos.insignia} ${registro.estadoExtra === "APROBADA" ? estilos.exito : registro.estadoExtra === "PENDIENTE" ? estilos.advertencia : registro.estadoExtra === "RECHAZADA" ? estilos.peligro : estilos.neutro}`}>{etiquetas[registro.estadoExtra]}</span></td></tr>)}</tbody></table></div>}</article>)}</div>{!dias.length && <p className={estilos.estadoVacioRegistros}>Sin historial.</p>}<Paginacion {...paginacion} total={dias.length} /></section>;
}
