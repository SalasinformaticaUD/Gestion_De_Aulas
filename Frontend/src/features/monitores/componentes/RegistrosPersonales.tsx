"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adaptarHorario, adaptarSesion, nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import type { RegistrosPersonalesApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { ResumenHoras } from "./ResumenHoras";
import estilos from "./SistemaVisualMonitores.module.css";
import { RegistrosPorDia } from "./registros/RegistrosPorDia";

const registrosVacios: RegistrosPersonalesApi = {
  monitorings: [],
  monitor: { id: "", full_name: "", codigo_estudiante: "", numero_documento: "", proyecto_curricular: "", proyecto_curricular_label: "", telefono: "", semester: null, semester_is_active: null, department: "", is_active: false },
  sessions: [], schedules: [], annotations: [], inconsistencies: [], memorandums: [],
};

const tiposAnotacion: Record<string, string> = {
  missing_punch: "Olvido de registro",
  virtual_hours: "Horas virtuales",
  permission: "Permiso",
  novelty: "Novedad",
};
const accionesAnotacion: Record<string, string> = { add: "Suma", deduct: "Descuento", note: "Informativa" };

export function RegistrosPersonales() {
  const [monitoriaSeleccionada, setMonitoriaSeleccionada] = useState("");
  const [anotacionDestacada, setAnotacionDestacada] = useState("");
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    setMonitoriaSeleccionada(parametros.get("monitoria") ?? "");
    setAnotacionDestacada(parametros.get("anotacion") ?? "");
  }, []);
  const cargarRegistros = useCallback(
    () => servicioMonitores.obtenerMisRegistros(monitoriaSeleccionada || undefined),
    [monitoriaSeleccionada],
  );
  const recurso = usarRecursoApi(cargarRegistros, registrosVacios);
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
  useEffect(() => {
    if (recurso.cargando || !anotacionDestacada) return;
    const elemento = document.getElementById(`anotacion-${anotacionDestacada}`);
    elemento?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [anotacionDestacada, recurso.cargando, recurso.datos.annotations]);
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
      {recurso.datos.monitorings.length > 1 && <section className={`${estilos.tarjeta} ${estilos.selectorMonitoriaPersonal}`}>
        <div><span className={estilos.etiqueta}>Historial académico</span><h2>Monitoría consultada</h2><p>Seleccione un semestre para ver sus registros y novedades de ese periodo.</p></div>
        <div className={estilos.opcionesMonitoriaPersonal} role="group" aria-label="Escoger semestre de monitoría">
          {recurso.datos.monitorings.map((item) => { const seleccionada = (monitoriaSeleccionada || monitor.id) === item.id; return <button type="button" key={item.id} aria-pressed={seleccionada} className={seleccionada ? estilos.opcionMonitoriaActiva : ""} onClick={() => { setMonitoriaSeleccionada(item.id); setAnotacionDestacada(""); }}>{item.semester || "Sin semestre"}<small>{item.semester_is_active && item.is_active ? "Monitoría actual" : "Monitoría anterior"}</small></button>; })}
        </div>
      </section>}
      <section className={`${estilos.tarjeta} ${estilos.fichaMonitor}`}>
        <div><h2>{monitor.full_name}</h2><dl><div><dt>Código</dt><dd>{monitor.codigo_estudiante}</dd></div><div><dt>Semestre</dt><dd>{monitor.semester || "Sin asignar"}</dd></div><div><dt>Dependencia</dt><dd>{nombreDependencia(monitor.department)}</dd></div></dl></div>
        <span className={`${estilos.insignia} ${monitor.semester_is_active ? estilos.exito : estilos.neutro}`}>{monitor.semester_is_active ? "Monitoría actual" : "Monitoría anterior"}</span>
      </section>
      <ResumenHoras resumen={resumen} incluirAlertas detalle memorandums={recurso.datos.memorandums.length} />

      <RegistrosPorDia sesiones={sesiones} horarios={horarios} />
      <section className={estilos.tarjeta}>
        <header><div><h2>Anotaciones del periodo</h2><p>{recurso.datos.annotations.length} anotación(es) asociada(s) a esta monitoría.</p></div></header>
        <div className={estilos.tablaContenedor}><table className={estilos.tabla}><thead><tr><th>Fecha</th><th>Tipo</th><th>Acción</th><th>Ajuste</th><th>Detalle</th></tr></thead><tbody>
          {recurso.datos.annotations.map((item) => <tr id={`anotacion-${item.id}`} className={anotacionDestacada === item.id ? estilos.filaDestacada : ""} key={item.id}><td>{item.occurred_on}</td><td>{tiposAnotacion[item.annotation_type] ?? item.annotation_type}</td><td>{accionesAnotacion[item.action] ?? item.action}</td><td>{item.delta_minutes ? `${item.delta_minutes > 0 ? "+" : ""}${item.delta_minutes} min` : "Sin ajuste"}</td><td>{item.description}</td></tr>)}
          {!recurso.datos.annotations.length && <tr><td colSpan={5} className={estilos.vacio}>No hay anotaciones en esta monitoría.</td></tr>}
        </tbody></table></div>
      </section>
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
