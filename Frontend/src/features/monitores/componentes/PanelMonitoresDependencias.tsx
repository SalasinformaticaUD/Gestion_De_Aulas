"use client";

import type { DashboardApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "./SistemaVisualMonitores.module.css";
import { BarraNotificacionesDashboard } from "./panel/BarraNotificacionesDashboard";
import { CalendarioHorariosDashboard } from "./panel/CalendarioHorariosDashboard";
import { TarjetasSeguimiento } from "./panel/TarjetasSeguimiento";

export function PanelMonitoresDependencias() {
  const tablero = usarRecursoApi(servicioMonitores.obtenerDashboard, { monitor_rows: [], pending_overtime: [], recent_annotations: [], notifications: [] } as DashboardApi);
  const error = tablero.error;
  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>Panel de monitores</h1><p>Resumen operativo del periodo académico actual.</p></div></section>
    {error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}
    <div className={estilos.dashboardConNotificaciones}><div className={estilos.contenidoDashboardMonitores}><CalendarioHorariosDashboard /><TarjetasSeguimiento tablero={tablero.datos} /></div><BarraNotificacionesDashboard notificaciones={tablero.datos.notifications} /></div>
  </div>;
}
