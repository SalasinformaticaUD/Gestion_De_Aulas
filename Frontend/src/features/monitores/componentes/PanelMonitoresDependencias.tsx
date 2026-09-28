"use client";

import { useCallback } from "react";
import type { DashboardApi, PanelMonitorApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "./SistemaVisualMonitores.module.css";
import { CalendarioHorariosDashboard } from "./panel/CalendarioHorariosDashboard";
import { TarjetasSeguimiento } from "./panel/TarjetasSeguimiento";
import { SelectorDependenciaAdmin, useFiltroDependenciaAdmin } from "./FiltroDependenciaAdmin";

const panelMonitorVacio: PanelMonitorApi = {
  monitor: { id: "", full_name: "", codigo_estudiante: "" }, schedules: [], recent_sessions: [], recent_annotations: [], late_count: 0,
};

function PanelPersonalMonitor() {
  const tablero = usarRecursoApi(servicioMonitores.obtenerMiDashboardMonitor, panelMonitorVacio);
  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>Mi panel de monitorías</h1><p>Consulte sus turnos asignados y las novedades de su actividad.</p></div></section>
    {tablero.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{tablero.error}</div>}
    <CalendarioHorariosDashboard horarios={tablero.datos.schedules} />
    <div className={estilos.rejillaPrincipal}>
      <section className={estilos.tarjeta}><header><div><h2>Registros recientes</h2><p>Sus últimas horas procesadas.</p></div></header><div className={estilos.listaLateral}>{tablero.datos.recent_sessions.length ? tablero.datos.recent_sessions.map((sesion) => <article key={sesion.id}><strong>{sesion.work_day}</strong><span>{sesion.normal_minutes / 60} h registradas{sesion.overtime_minutes ? ` · ${sesion.overtime_minutes / 60} h extra` : ""}</span></article>) : <p className={estilos.vacio}>Aún no hay registros procesados.</p>}</div></section>
      <section className={estilos.tarjeta}><header><div><h2>Anotaciones recientes</h2><p>Novedades asociadas a sus monitorías.</p></div></header><div className={estilos.listaLateral}>{tablero.datos.recent_annotations.length ? tablero.datos.recent_annotations.map((anotacion) => <article key={anotacion.id}><strong>{anotacion.occurred_on}</strong><span>{anotacion.description}</span></article>) : <p className={estilos.vacio}>No tiene anotaciones recientes.</p>}</div></section>
      <section className={estilos.tarjeta}><header><div><h2>Llegadas tarde</h2><p>Retardos registrados en sus monitorías.</p></div><span className={`${estilos.insignia} ${tablero.datos.late_count ? estilos.advertencia : estilos.exito}`}>{tablero.datos.late_count}</span></header><div className={estilos.listaLateral}><p className={estilos.vacio}>{tablero.datos.late_count ? "Revise el detalle de sus registros para conocer cada llegada tarde." : "No tiene llegadas tarde registradas."}</p></div></section>
    </div>
  </div>;
}

function PanelGestionMonitores() {
  const { esAdministrador, dependencia, setDependencia } = useFiltroDependenciaAdmin();
  const cargarDashboard = useCallback(() => servicioMonitores.obtenerDashboard(dependencia || undefined), [dependencia]);
  const tablero = usarRecursoApi(cargarDashboard, { monitor_rows: [], pending_overtime: [], recent_annotations: [], notifications: [] } as DashboardApi);
  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>Panel de monitores</h1><p>Resumen operativo del periodo académico actual.</p></div><SelectorDependenciaAdmin visible={esAdministrador} value={dependencia} onChange={setDependencia} /></section>
    {tablero.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{tablero.error}</div>}
    <div className={estilos.contenidoDashboardMonitores}><CalendarioHorariosDashboard dependencia={dependencia || undefined} /><TarjetasSeguimiento tablero={tablero.datos} /></div>
  </div>;
}

export function PanelMonitoresDependencias() {
  const perfil = usarRecursoApi(servicioMonitores.obtenerPerfilMonitores, { role: "" });
  if (perfil.cargando) return <div className={estilos.dashboardMonitores}><p className={estilos.vacio}>Cargando panel…</p></div>;
  return String(perfil.datos.role).trim().toLowerCase() === "monitor" ? <PanelPersonalMonitor /> : <PanelGestionMonitores />;
}

