"use client";

import { useMemo, useState } from "react";
import type { DashboardApi } from "@/features/monitores/api/contratosMonitores";
import estilos from "../SistemaVisualMonitores.module.css";

type Notificacion = DashboardApi["notifications"][number];

export function BarraNotificacionesDashboard({ notificaciones }: { notificaciones: Notificacion[] }) {
  const [soloNuevas, setSoloNuevas] = useState(false);
  const nuevas = useMemo(() => notificaciones.filter((item) => !item.is_read), [notificaciones]);
  const visibles = soloNuevas ? nuevas : notificaciones;

  return <aside className={estilos.barraNotificacionesDashboard} aria-label="Notificaciones del Dashboard">
    <header>
      <div><h2>Notificaciones</h2><p>{visibles.length} novedades visibles</p></div>
      <span>En línea</span>
    </header>
    <div className={estilos.resumenNotificacionesDashboard}>
      <span><strong>{nuevas.length}</strong>Nuevas</span>
      <span><strong>{notificaciones.length}</strong>Total</span>
    </div>
    <div className={estilos.filtrosNotificacionesDashboard} aria-label="Filtrar notificaciones">
      <button type="button" aria-pressed={!soloNuevas} className={!soloNuevas ? estilos.filtroNotificacionActivo : undefined} onClick={() => setSoloNuevas(false)}>Todas</button>
      <button type="button" aria-pressed={soloNuevas} className={soloNuevas ? estilos.filtroNotificacionActivo : undefined} onClick={() => setSoloNuevas(true)}>Nuevas</button>
    </div>
    <div className={estilos.listaNotificacionesDashboard}>
      {visibles.map((item) => <article key={item.id} className={!item.is_read ? estilos.notificacionNuevaDashboard : undefined}>
        <header><span>{item.is_read ? "Leída" : "Nueva"}</span><i aria-hidden="true" /></header>
        <strong>{item.title}</strong>
        <p>{item.body}</p>
      </article>)}
      {!visibles.length && <p className={estilos.notificacionesVaciasDashboard}>{soloNuevas ? "No hay notificaciones nuevas." : "No hay notificaciones recientes."}</p>}
    </div>
    <footer><span>Información del período actual</span><b>Actualizado</b></footer>
  </aside>;
}
