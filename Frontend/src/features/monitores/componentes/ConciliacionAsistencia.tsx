"use client";

import { useCallback, useMemo, useState } from "react";
import { adaptarMonitor, nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import type { ConciliacionApi, MonitorApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { Paginacion } from "./Paginacion";
import { AvisoTemporal } from "./AvisoTemporal";
import estilos from "./SistemaVisualMonitores.module.css";
import estilosPestanas from "./PestanasActas.module.css";

const TAMANO_PAGINA_HISTORIAL = 8;
const historialVacio = { count: 0, next: null, previous: null, results: [] as ConciliacionApi[] };

function fechaLarga(valor: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${valor}T12:00:00`));
}

export function ConciliacionAsistencia() {
  const [vista, setVista] = useState<"PENDIENTES" | "HISTORIAL">("PENDIENTES");
  const recurso = usarRecursoApi(servicioMonitores.listarConciliaciones, [] as ConciliacionApi[]);
  const recursoMonitores = usarRecursoApi(servicioMonitores.listarMonitores, [] as MonitorApi[]);
  const recursoPerfil = usarRecursoApi(servicioMonitores.obtenerPerfilMonitores, { role: "leader" });
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const cargarHistorial = useCallback(
    () => servicioMonitores.listarPaginaHistorialAsistencia(paginaHistorial),
    [paginaHistorial],
  );
  const recursoHistorial = usarRecursoApi(cargarHistorial, historialVacio);
  const [nombre, setNombre] = useState("");
  const [dependencia, setDependencia] = useState("");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [selecciones, setSelecciones] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [procesando, setProcesando] = useState("");
  const dependenciaVisible = recursoPerfil.datos.role === "admin" ? dependencia : (recursoPerfil.datos.department ?? "");

  const monitores = useMemo(() => recursoMonitores.datos.map(adaptarMonitor), [recursoMonitores.datos]);
  const monitoresActivos = useMemo(() => monitores.filter((monitor) => monitor.activo), [monitores]);
  const candidatosPara = (registro: ConciliacionApi) =>
    monitoresActivos.filter((monitor) => monitor.dependencia === nombreDependencia(registro.raw_department));
  const filtrados = useMemo(
    () => recurso.datos.filter((item) =>
      (!nombre || item.raw_full_name.toLocaleLowerCase("es").includes(nombre.toLocaleLowerCase("es"))) &&
      (!dependenciaVisible || item.raw_department === dependenciaVisible) &&
      (!fecha || item.work_day === fecha) &&
      (!motivo || `${item.manual_review_reason} ${item.processing_error}`.toLocaleLowerCase("es").includes(motivo.toLocaleLowerCase("es"))),
    ),
    [recurso.datos, nombre, dependenciaVisible, fecha, motivo],
  );
  const paginacion = usarPaginacion(filtrados, 8);
  const totalPaginasHistorial = Math.max(1, Math.ceil(recursoHistorial.datos.count / TAMANO_PAGINA_HISTORIAL));

  const limpiar = () => {
    setNombre("");
    setDependencia("");
    setFecha("");
    setMotivo("");
    paginacion.reiniciar();
  };

  const vincular = async (registro: ConciliacionApi) => {
    const monitorId = selecciones[registro.id];
    if (!monitorId) return;
    setProcesando(registro.id);
    setAviso("");
    try {
      await servicioMonitores.asignarMonitor(registro.id, monitorId);
      recurso.setDatos((actual) => actual.filter((item) => item.id !== registro.id));
      if (paginaHistorial === 1) await recursoHistorial.recargar();
      else setPaginaHistorial(1);
      setAviso(`${registro.raw_full_name} fue vinculado correctamente.`);
    } catch (problema) {
      setAviso(problema instanceof Error ? problema.message : "No fue posible vincular el registro.");
    } finally {
      setProcesando("");
    }
  };

  const error = recurso.error || recursoHistorial.error || recursoMonitores.error;

  return <>
    <section className={`page-heading ${estilos.encabezado}`}>
      <div><span className={estilos.etiqueta}>Asistencia</span><h1>Registros pendientes de conciliación</h1><p>Vincule nombres no reconocidos con el monitor correcto.</p></div>
      <span className={`${estilos.insignia} ${estilos.advertencia}`}>Mostrando {filtrados.length} registros visibles.</span>
    </section>
    {error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}
    {aviso && <AvisoTemporal mensaje={aviso} tipo={aviso.includes("correctamente") ? "exito" : "error"} alCerrar={() => setAviso("")} />}
    <section className={estilos.tarjeta}><header className={estilosPestanas.cabeceraPestanas}><div className={estilosPestanas.pestanas} role="tablist" aria-label="Vistas de conciliación"><button type="button" role="tab" aria-selected={vista === "PENDIENTES"} className={vista === "PENDIENTES" ? estilosPestanas.pestanaActiva : ""} onClick={() => setVista("PENDIENTES")}>Pendientes</button><button type="button" role="tab" aria-selected={vista === "HISTORIAL"} className={vista === "HISTORIAL" ? estilosPestanas.pestanaActiva : ""} onClick={() => setVista("HISTORIAL")}>Historial</button></div><div className={estilosPestanas.indicadorVista}><i />{vista === "PENDIENTES" ? "Registros por conciliar" : "Conciliaciones finalizadas"}</div></header></section>
    {vista === "PENDIENTES" && <section className={estilos.tarjeta}>
      <div className={estilos.barraHerramientas}>
        <label className={estilos.campoAncho}><span>Nombre crudo</span><input value={nombre} onChange={(event) => { setNombre(event.target.value); paginacion.reiniciar(); }} placeholder="Filtrar nombre" /></label>
        {recursoPerfil.datos.role === "admin" && <label className={estilos.campo}><span>Dependencia</span><select value={dependencia} onChange={(event) => { setDependencia(event.target.value); paginacion.reiniciar(); }}><option value="">Todas</option>{[...new Set(recurso.datos.map((item) => item.raw_department))].map((item) => <option key={item}>{item}</option>)}</select></label>}
        <label className={estilos.campo}><span>Fecha</span><input type="date" value={fecha} onChange={(event) => { setFecha(event.target.value); paginacion.reiniciar(); }} /></label>
        <label className={estilos.campo}><span>Motivo</span><input value={motivo} onChange={(event) => { setMotivo(event.target.value); paginacion.reiniciar(); }} placeholder="Filtrar motivo" /></label>
        <button type="button" className={estilos.botonSecundario} onClick={limpiar}>Limpiar</button>
      </div>
      <div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaConciliacion}`}><thead><tr><th>Nombre crudo</th><th>Dependencia</th><th>Fecha</th><th>Motivo</th><th>Acción</th></tr></thead><tbody>
        {paginacion.visibles.map((registro) => { const candidatos = candidatosPara(registro); return <tr key={registro.id}><td><strong>{registro.raw_full_name}</strong></td><td>{nombreDependencia(registro.raw_department)}</td><td>{registro.work_day}</td><td>{registro.manual_review_reason || registro.processing_error || "Coincidencia no encontrada"}</td><td><div className={`${estilos.accionesTabla} ${estilos.accionesConciliacion}`}><select aria-label={`Monitor para ${registro.raw_full_name}`} value={selecciones[registro.id] ?? ""} disabled={!candidatos.length} onChange={(event) => setSelecciones((actual) => ({ ...actual, [registro.id]: event.target.value }))}><option value="">{candidatos.length ? "Seleccione un monitor" : "Sin monitores activos en esta dependencia"}</option>{candidatos.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.codigo}</option>)}</select><button type="button" disabled={!selecciones[registro.id] || procesando === registro.id} onClick={() => void vincular(registro)}>{procesando === registro.id ? "Vinculando…" : "Vincular"}</button></div></td></tr>; })}
        {!recurso.cargando && filtrados.length === 0 && <tr><td colSpan={5} className={estilos.vacio}>No hay registros pendientes.</td></tr>}
      </tbody></table></div>
      <Paginacion {...paginacion} total={filtrados.length} />
    </section>}
    {vista === "HISTORIAL" && <section className={`${estilos.tarjeta} ${estilos.historialConciliacion}`}>
      <header><div><h2>Historial</h2><p>{recursoHistorial.datos.count} registros visibles.</p></div></header>
      <div className={estilos.tablaContenedor}><table className={estilos.tabla}><thead><tr><th>Nombre crudo</th><th>Dependencia</th><th>Fecha</th><th>Estado</th><th>Monitor</th></tr></thead><tbody>
        {recursoHistorial.datos.results.filter((registro) => !dependenciaVisible || registro.raw_department === dependenciaVisible).map((registro) => <tr key={registro.id}><td><strong>{registro.raw_full_name}</strong></td><td>{nombreDependencia(registro.raw_department)}</td><td>{fechaLarga(registro.work_day)}</td><td><span className={`${estilos.insignia} ${registro.reconciliation_status === "matched" ? estilos.exito : estilos.peligro}`}>{registro.reconciliation_status === "matched" ? "Conciliado" : "Rechazado"}</span></td><td><strong>{registro.monitor_name || "Sin monitor asociado"}</strong></td></tr>)}
        {!recursoHistorial.cargando && recursoHistorial.datos.results.length === 0 && <tr><td colSpan={5} className={estilos.vacio}>No hay registros conciliados o rechazados en el historial.</td></tr>}
      </tbody></table></div>
      <Paginacion pagina={paginaHistorial} totalPaginas={totalPaginasHistorial} total={recursoHistorial.datos.count} anterior={() => setPaginaHistorial((actual) => Math.max(1, actual - 1))} siguiente={() => setPaginaHistorial((actual) => Math.min(totalPaginasHistorial, actual + 1))} />
    </section>}
  </>;
}
