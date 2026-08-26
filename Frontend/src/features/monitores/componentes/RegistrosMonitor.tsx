"use client";
import Link from "next/link";
import { useMemo } from "react";
import { adaptarMonitor, adaptarResumenDashboard, adaptarSesion } from "@/features/monitores/api/adaptadoresMonitores";
import type { DashboardApi, MonitorApi, SesionApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { ResumenHoras } from "./ResumenHoras";
import { TablaSesiones } from "./TablaSesiones";
import estilos from "./SistemaVisualMonitores.module.css";

export function RegistrosMonitor({ monitorId }:{ monitorId:string }) {
  const recursoMonitores=usarRecursoApi(servicioMonitores.listarMonitores,[] as MonitorApi[]);const recursoSesiones=usarRecursoApi(servicioMonitores.listarSesiones,[] as SesionApi[]);const tablero=usarRecursoApi(servicioMonitores.obtenerDashboard,{monitor_rows:[],pending_overtime:[],recent_annotations:[],notifications:[]} as DashboardApi);const monitor=useMemo(()=>recursoMonitores.datos.map(adaptarMonitor).find((item)=>item.id===monitorId),[recursoMonitores.datos,monitorId]);const resumen=useMemo(()=>adaptarResumenDashboard(tablero.datos.monitor_rows).find((item)=>item.monitorId===monitorId),[tablero.datos.monitor_rows,monitorId]);const sesiones=useMemo(()=>recursoSesiones.datos.filter((item)=>item.monitor===monitorId).map(adaptarSesion),[recursoSesiones.datos,monitorId]);const error=recursoMonitores.error||recursoSesiones.error||tablero.error;
  return <><section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Detalle individual</span><h1>Registros del monitor</h1><p>Entradas, salidas y cálculo acumulado de horas.</p></div><Link className={estilos.botonSecundario} href="/gestion-monitores">Volver al dashboard</Link></section>{error&&<div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}{monitor?<><section className={estilos.tarjeta}><div className={estilos.detalleMonitor}><div><h2>{monitor.nombre}</h2><p>Código {monitor.codigo} · {monitor.dependencia}</p></div><span className={`${estilos.insignia} ${monitor.activo?estilos.exito:estilos.neutro}`}>{monitor.activo?"Monitor activo":"Monitor inactivo"}</span></div></section><div style={{height:"1rem"}}/>{resumen&&<ResumenHoras resumen={resumen}/>}<TablaSesiones sesiones={sesiones}/></>:!recursoMonitores.cargando&&<div className={`${estilos.aviso} ${estilos.avisoError}`}>El monitor solicitado no existe o no está dentro de su dependencia.</div>}</>;
}
