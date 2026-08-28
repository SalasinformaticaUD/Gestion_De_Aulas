"use client";
import Link from "next/link";
import { useMemo } from "react";
import { adaptarMonitor, adaptarResumenDashboard, adaptarSesion } from "@/features/monitores/api/adaptadoresMonitores";
import type { DashboardApi, MonitorApi, SesionApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { ResumenHoras } from "./ResumenHoras";
import estilos from "./SistemaVisualMonitores.module.css";
import { FichaMonitor } from "./registros/FichaMonitor";
import { RegistrosPorDia } from "./registros/RegistrosPorDia";

export function RegistrosMonitor({ monitorId }:{ monitorId:string }) {
  const recursoMonitores=usarRecursoApi(servicioMonitores.listarMonitores,[] as MonitorApi[]);const recursoSesiones=usarRecursoApi(servicioMonitores.listarSesiones,[] as SesionApi[]);const tablero=usarRecursoApi(servicioMonitores.obtenerDashboard,{monitor_rows:[],pending_overtime:[],recent_annotations:[],notifications:[]} as DashboardApi);const monitor=useMemo(()=>recursoMonitores.datos.map(adaptarMonitor).find((item)=>item.id===monitorId),[recursoMonitores.datos,monitorId]);const resumen=useMemo(()=>adaptarResumenDashboard(tablero.datos.monitor_rows).find((item)=>item.monitorId===monitorId),[tablero.datos.monitor_rows,monitorId]);const sesiones=useMemo(()=>recursoSesiones.datos.filter((item)=>item.monitor===monitorId).map(adaptarSesion),[recursoSesiones.datos,monitorId]);const error=recursoMonitores.error||recursoSesiones.error||tablero.error;
  return <div className={estilos.detalleRegistros}><section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Detalle individual</span><h1>Registros del monitor</h1><p>Primero se muestran los días con registros; abre un día para ver su línea multinivel.</p></div><Link className={estilos.botonSecundario} href="/gestion-monitores">Volver al dashboard</Link></section>{error&&<div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}{monitor?<><FichaMonitor monitor={monitor}/>{resumen&&<ResumenHoras resumen={resumen} detalle/>}<RegistrosPorDia sesiones={sesiones}/></>:!recursoMonitores.cargando&&<div className={`${estilos.aviso} ${estilos.avisoError}`}>El monitor solicitado no existe o no está dentro de su dependencia.</div>}</div>;
}
