"use client";

import { useMemo } from "react";
import { adaptarHorario, adaptarSesion, nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import type { RegistrosPersonalesApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { ResumenHoras } from "./ResumenHoras";
import estilos from "./SistemaVisualMonitores.module.css";
import { RegistrosPorDia } from "./registros/RegistrosPorDia";

const registrosVacios: RegistrosPersonalesApi = {
  monitor: { id: "", full_name: "", codigo_estudiante: "", numero_documento: "", proyecto_curricular: "", proyecto_curricular_label: "", telefono: "", semester: null, semester_is_active: null, department: "", is_active: false },
  sessions: [], schedules: [], annotations: [], inconsistencies: [], memorandums: [],
};

export function RegistrosPersonales() {
  const recurso = usarRecursoApi(servicioMonitores.obtenerMisRegistros, registrosVacios);
  const sesiones = useMemo(() => recurso.datos.sessions.map(adaptarSesion), [recurso.datos.sessions]);
  const horarios = useMemo(() => recurso.datos.schedules.map(adaptarHorario), [recurso.datos.schedules]);
  const resumen = useMemo(() => {
    const sesionesApi = recurso.datos.sessions;
    return {
      monitorId: recurso.datos.monitor.id,
      horasNormales: sesionesApi.reduce((total, sesion) => total + sesion.normal_minutes, 0) / 60,
      horasExtraAprobadas: sesionesApi.filter((sesion) => sesion.overtime_status === "approved").reduce((total, sesion) => total + sesion.overtime_minutes, 0) / 60,
      horasExtraPendientes: sesionesApi.filter((sesion) => sesion.overtime_status === "pending").reduce((total, sesion) => total + sesion.overtime_minutes, 0) / 60,
      horasAnotaciones: recurso.datos.annotations.reduce((total, anotacion) => total + anotacion.delta_minutes, 0) / 60,
      retrasos: sesionesApi.filter((sesion) => sesion.late_minutes > 0 && !sesion.lateness_excused).length,
      tieneMemorando: recurso.datos.memorandums.length > 0,
    };
  }, [recurso.datos]);

  const monitor = recurso.datos.monitor;
  return <div className={estilos.detalleRegistros}>
    <section className={`page-heading ${estilos.encabezado}`}>
      <div>
        <span className={estilos.etiqueta}>Mis monitorías</span>
        <h1>Mis registros</h1>
        <p>Consulte sus marcaciones, horas procesadas, anotaciones e inconsistencias.</p>
      </div>
    </section>
    {recurso.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{recurso.error}</div>}
    {!recurso.cargando && <>
      <section className={`${estilos.tarjeta} ${estilos.fichaMonitor}`}>
        <div><h2>{monitor.full_name}</h2><dl><div><dt>Código</dt><dd>{monitor.codigo_estudiante}</dd></div><div><dt>Dependencia</dt><dd>{nombreDependencia(monitor.department)}</dd></div></dl></div>
        <span className={`${estilos.insignia} ${monitor.is_active ? estilos.exito : estilos.neutro}`}>{monitor.is_active ? "Monitor activo" : "Monitor inactivo"}</span>
      </section>
      <ResumenHoras resumen={resumen} incluirAlertas detalle memorandums={recurso.datos.memorandums.length} />
      
      <RegistrosPorDia sesiones={sesiones} horarios={horarios} />
      <section className={estilos.tarjeta}>
        <header><div><h2>Inconsistencias relacionadas</h2><p>{recurso.datos.inconsistencies.length} inconsistencia(s) asociada(s) a sus registros.</p></div></header>
        <div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaInconsistenciasRelacionadas}`}><thead><tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>
          {recurso.datos.inconsistencies.map((item) => <tr key={item.id}><td>{item.work_day}</td><td>{item.inconsistency_type_label}</td><td><span className={`${estilos.insignia} ${item.status === "pending" ? estilos.advertencia : estilos.exito}`}>{item.status_label}</span></td><td>{item.message}</td></tr>)}
          {!recurso.datos.inconsistencies.length && <tr><td colSpan={4} className={estilos.vacio}>No hay inconsistencias relacionadas.</td></tr>}
        </tbody></table></div>
      </section>
    </>}
  </div>;
}
