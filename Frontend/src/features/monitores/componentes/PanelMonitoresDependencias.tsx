"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { DashboardApi, PanelMonitorApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "./SistemaVisualMonitores.module.css";
import { CalendarioHorariosDashboard } from "./panel/CalendarioHorariosDashboard";
import { TarjetasSeguimiento } from "./panel/TarjetasSeguimiento";
import { SelectorDependenciaAdmin, useFiltroDependenciaAdmin } from "./FiltroDependenciaAdmin";

const panelMonitorVacio: PanelMonitorApi = {
  monitor: { id: "", full_name: "", codigo_estudiante: "" }, monitorings: [], schedule_monitoring_id: "", schedules: [], recent_sessions: [], recent_annotations: [], late_count: 0,
};

function PanelPersonalMonitor() {
  const [monitoriaHorario, setMonitoriaHorario] = useState("");
  const cargarDashboard = useCallback(
    () => servicioMonitores.obtenerMiDashboardMonitor(monitoriaHorario || undefined),
    [monitoriaHorario],
  );
  const tablero = usarRecursoApi(cargarDashboard, panelMonitorVacio);
  const monitoriaMostrada = tablero.datos.monitorings.find((item) => item.id === tablero.datos.schedule_monitoring_id);
  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>Mi panel de monitorías</h1><p>Consulte sus turnos asignados y las novedades de su actividad.</p></div></section>
    {tablero.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{tablero.error}</div>}
    {tablero.datos.monitorings.length > 1 && <section className={`${estilos.tarjeta} ${estilos.selectorMonitoriaPersonal}`}>
      <div><span className={estilos.etiqueta}>Horario académico</span><h2>Semestre del horario</h2><p>Seleccione la monitoría cuyo horario desea consultar.</p></div>
      <div className={estilos.opcionesMonitoriaPersonal} role="group" aria-label="Escoger semestre del horario">
        {tablero.datos.monitorings.map((item) => <button type="button" key={item.id} aria-pressed={tablero.datos.schedule_monitoring_id === item.id} className={tablero.datos.schedule_monitoring_id === item.id ? estilos.opcionMonitoriaActiva : ""} onClick={() => setMonitoriaHorario(item.id)}>{item.semester || "Sin semestre"}<small>{item.semester_is_active && item.is_active ? "Monitoría actual" : "Monitoría anterior"}</small></button>)}
      </div>
    </section>}
    <CalendarioHorariosDashboard horarios={tablero.datos.schedules} periodo={monitoriaMostrada?.semester ?? undefined} />
    <div className={estilos.rejillaPrincipal}>
      <section className={estilos.tarjeta}><header><div><h2>Registros recientes</h2><p>Sus últimas horas procesadas.</p></div></header><div className={estilos.listaLateral}>{tablero.datos.recent_sessions.length ? tablero.datos.recent_sessions.map((sesion) => <article className={estilos.itemResumenPersonal} key={sesion.id}><div className={estilos.contenidoResumenPersonal}><strong>{sesion.work_day}</strong><span>{sesion.normal_minutes / 60} h registradas{sesion.overtime_minutes ? ` · ${sesion.overtime_minutes / 60} h extra` : ""}</span></div><Link className={estilos.accionResumenPersonal} href={`/gestion-monitores/registros?monitoria=${encodeURIComponent(tablero.datos.monitor.id)}&fecha=${encodeURIComponent(sesion.work_day)}&registro=${encodeURIComponent(sesion.id)}#registro-${sesion.id}`}>Ver registro</Link></article>) : <p className={estilos.vacio}>Aún no hay registros procesados.</p>}</div></section>
      <section className={estilos.tarjeta}><header><div><h2>Anotaciones recientes</h2><p>Novedades asociadas a sus monitorías.</p></div></header><div className={estilos.listaLateral}>{tablero.datos.recent_annotations.length ? tablero.datos.recent_annotations.map((anotacion) => <article className={estilos.itemResumenPersonal} key={anotacion.id}><div className={estilos.contenidoResumenPersonal}><strong>{anotacion.occurred_on}</strong><span>{anotacion.description}</span></div><Link className={estilos.accionResumenPersonal} href={`/gestion-monitores/anotaciones?anotacion=${encodeURIComponent(anotacion.id)}#anotacion-${anotacion.id}`}>Ver anotación</Link></article>) : <p className={estilos.vacio}>No tiene anotaciones recientes.</p>}</div></section>
      <section className={estilos.tarjeta}><header><div><h2>Llegadas tarde</h2><p>Retardos registrados en sus monitorías.</p></div><span className={`${estilos.insignia} ${tablero.datos.late_count ? estilos.advertencia : estilos.exito}`}>{tablero.datos.late_count}</span></header><div className={estilos.listaLateral}><p className={estilos.vacio}>{tablero.datos.late_count ? "Revise el detalle de sus registros para conocer cada llegada tarde." : "No tiene llegadas tarde registradas."}</p></div></section>
    </div>
  </div>;
}

function PanelGestionMonitores({ modoHorarioAulas = false }: { modoHorarioAulas?: boolean }) {
  const { esAdministrador, dependencia, setDependencia } = useFiltroDependenciaAdmin(modoHorarioAulas ? "informatics_labs" : "");
  const cargarDashboard = useCallback(() => servicioMonitores.obtenerDashboard(dependencia || undefined), [dependencia]);
  const tablero = usarRecursoApi(cargarDashboard, { monitor_rows: [], pending_overtime: [], recent_annotations: [], notifications: [] } as DashboardApi, !modoHorarioAulas);
  const cargarPrevisualizacion = useCallback(() => servicioMonitores.obtenerPrevisualizacionHorarioAulas(), []);
  const previsualizacion = usarRecursoApi(cargarPrevisualizacion, { dashboard: { monitor_rows: [], pending_overtime: [], recent_annotations: [], notifications: [] } as DashboardApi, schedules: [], monitors: [] }, modoHorarioAulas);
  const datosTablero = modoHorarioAulas ? previsualizacion.datos.dashboard : tablero.datos;
  const error = modoHorarioAulas ? previsualizacion.error : tablero.error;
  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>{modoHorarioAulas ? "Horario de monitores" : "Panel de monitores"}</h1><p>{modoHorarioAulas ? "Consulta operativa de Monitores Aulas de Software." : "Resumen operativo del periodo académico actual."}</p></div><SelectorDependenciaAdmin visible={esAdministrador} value={dependencia} onChange={setDependencia} /></section>
    {error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}
    <div className={estilos.contenidoDashboardMonitores}><CalendarioHorariosDashboard dependencia={dependencia || undefined} horarios={modoHorarioAulas ? previsualizacion.datos.schedules : undefined} monitores={modoHorarioAulas ? previsualizacion.datos.monitors : undefined} />{!modoHorarioAulas && <TarjetasSeguimiento tablero={datosTablero} />}</div>
  </div>;
}

export function PanelMonitoresDependencias({ modoHorarioAulas = false }: { modoHorarioAulas?: boolean }) {
  const perfil = usarRecursoApi(servicioMonitores.obtenerPerfilMonitores, { role: "" });
  if (modoHorarioAulas) return <PanelGestionMonitores modoHorarioAulas />;
  if (perfil.cargando) return <div className={estilos.dashboardMonitores}><p className={estilos.vacio}>Cargando panel…</p></div>;
  return String(perfil.datos.role).trim().toLowerCase() === "monitor" ? <PanelPersonalMonitor /> : <PanelGestionMonitores />;
}

