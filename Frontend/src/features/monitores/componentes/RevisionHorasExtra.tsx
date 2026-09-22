"use client";

import { useMemo, useState } from "react";
import type { SesionApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { Paginacion } from "./Paginacion";
import { AvisoTemporal } from "./AvisoTemporal";
import estilos from "./SistemaVisualMonitores.module.css";

type ModoDecision = "approve" | "reject";
type ModalDecision = { sesion: SesionApi; modo: ModoDecision } | null;

const horas = (minutos: number) => `${(minutos / 60).toFixed(2)} h`;
const hora = (valor?: string | null) => valor ? valor.slice(0, 5) : "No registrada";
const fechaHora = (valor?: string | null) => valor ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(valor)) : "No registrada";

export function RevisionHorasExtra() {
  const recurso = usarRecursoApi(servicioMonitores.listarSesiones, [] as SesionApi[]);
  const [monitor, setMonitor] = useState("");
  const [fecha, setFecha] = useState("");
  const [estadoHistorial, setEstadoHistorial] = useState("TODOS");
  const [detalle, setDetalle] = useState<SesionApi | null>(null);
  const [modalDecision, setModalDecision] = useState<ModalDecision>(null);
  const [nota, setNota] = useState("");
  const [penalizar, setPenalizar] = useState(false);
  const [aviso, setAviso] = useState("");
  const [procesando, setProcesando] = useState("");

  const coincideFiltros = (item: SesionApi) => (!monitor || item.monitor_name.toLocaleLowerCase("es").includes(monitor.toLocaleLowerCase("es"))) && (!fecha || item.work_day === fecha);
  const pendientes = useMemo(() => recurso.datos.filter((item) => item.overtime_status === "pending" && coincideFiltros(item)), [recurso.datos, monitor, fecha]);
  const historial = useMemo(() => recurso.datos.filter((item) => ["approved", "rejected"].includes(item.overtime_status) && coincideFiltros(item) && (estadoHistorial === "TODOS" || item.overtime_status === estadoHistorial)), [recurso.datos, monitor, fecha, estadoHistorial]);
  const paginacionPendientes = usarPaginacion(pendientes, 8);
  const paginacionHistorial = usarPaginacion(historial, 8);

  const actualizarFiltros = (accion: () => void) => { accion(); paginacionPendientes.reiniciar(); paginacionHistorial.reiniciar(); };
  const abrirDecision = (sesion: SesionApi, modo: ModoDecision) => { setModalDecision({ sesion, modo }); setNota(""); setPenalizar(false); };

  async function guardarDecision() {
    if (!modalDecision) return;
    const texto = nota.trim();
    if (modalDecision.modo === "reject" && !texto) return setAviso("Debes indicar el motivo del rechazo.");
    setProcesando(modalDecision.sesion.id); setAviso("");
    try {
      const actualizada = await servicioMonitores.revisarHorasExtra(modalDecision.sesion.id, { decision: modalDecision.modo, note: texto, penalize_on_reject: modalDecision.modo === "reject" && penalizar });
      recurso.setDatos((actual) => actual.map((item) => item.id === actualizada.id ? actualizada : item));
      setAviso(modalDecision.modo === "approve" ? "Se aprobaron y guardaron las horas extra." : "Se rechazaron y guardaron las horas extra.");
      setModalDecision(null); setNota(""); setPenalizar(false);
    } catch (problema) { setAviso(problema instanceof Error ? problema.message : "No fue posible guardar la decisión."); }
    finally { setProcesando(""); }
  }

  function limpiar() { setMonitor(""); setFecha(""); setEstadoHistorial("TODOS"); paginacionPendientes.reiniciar(); paginacionHistorial.reiniciar(); }

  return <div className={estilos.revisionHorasExtra}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Control de novedades</span><h1>Horas extra</h1><p>Revise solicitudes pendientes y consulte el historial de decisiones.</p></div><span className={`${estilos.insignia} ${estilos.advertencia}`}>{pendientes.length} pendiente(s)</span></section>
    {recurso.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{recurso.error}</div>}{aviso && <AvisoTemporal mensaje={aviso} tipo={aviso.startsWith("Se ") ? "exito" : "error"} alCerrar={() => setAviso("")} />}

    <section className={estilos.tarjeta}><header><div><h2>Solicitudes pendientes</h2><p>Seleccione una solicitud para consultar el registro completo, aprobarla o rechazarla.</p></div></header><div className={estilos.barraHerramientas}><label className={estilos.campoAncho}><span>Monitor</span><input value={monitor} onChange={(e) => actualizarFiltros(() => setMonitor(e.target.value))} placeholder="Buscar por nombre" /></label><label className={estilos.campo}><span>Fecha</span><input type="date" value={fecha} onChange={(e) => actualizarFiltros(() => setFecha(e.target.value))} /></label><div className={estilos.accionesFormulario}><button type="button" className={estilos.botonSecundario} onClick={limpiar}>Limpiar</button></div></div>
      <div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaHorasExtraNueva}`}><thead><tr><th>Monitor</th><th>Fecha</th><th>Entrada / salida</th><th>Horas extra</th><th>Registro</th><th>Decisión</th></tr></thead><tbody>{paginacionPendientes.visibles.map((sesion) => <tr key={sesion.id}><td><strong>{sesion.monitor_name}</strong></td><td>{sesion.work_day}</td><td>{hora(sesion.actual_start)} – {hora(sesion.actual_end)}</td><td><strong>{horas(sesion.overtime_minutes)}</strong></td><td><button type="button" className={estilos.botonSecundario} onClick={() => setDetalle(sesion)}>Ver registro de hora extra</button></td><td><div className={estilos.accionesDecisionExtra}><button type="button" className={estilos.aprobarExtra} onClick={() => abrirDecision(sesion, "approve")}>Aprobar y guardar</button><button type="button" className={estilos.rechazarExtra} onClick={() => abrirDecision(sesion, "reject")}>Rechazar</button></div></td></tr>)}{!recurso.cargando && !pendientes.length && <tr><td colSpan={6} className={estilos.vacio}>No hay solicitudes de horas extra pendientes.</td></tr>}</tbody></table></div><Paginacion {...paginacionPendientes} total={pendientes.length} />
    </section>

    <section className={`${estilos.tarjeta} ${estilos.historialHorasExtra}`}><header><div><h2>Historial de horas extra</h2><p>Aprobaciones y rechazos con la información registrada en cada decisión.</p></div><span className={`${estilos.insignia} ${estilos.neutro}`}>{historial.length} decisión(es)</span></header><div className={estilos.barraHerramientas}><label className={estilos.campo}><span>Decisión</span><select value={estadoHistorial} onChange={(e) => actualizarFiltros(() => setEstadoHistorial(e.target.value))}><option value="TODOS">Todas</option><option value="approved">Aprobadas</option><option value="rejected">Rechazadas</option></select></label></div><div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaHistorialExtra}`}><thead><tr><th>Monitor</th><th>Fecha</th><th>Horas extra</th><th>Decisión</th><th>Anotación</th><th>Penalización</th><th>Revisado por</th><th>Registro</th></tr></thead><tbody>{paginacionHistorial.visibles.map((sesion) => <tr key={sesion.id}><td><strong>{sesion.monitor_name}</strong></td><td>{sesion.work_day}<small>{fechaHora(sesion.overtime_reviewed_at)}</small></td><td>{horas(sesion.overtime_minutes)}</td><td><span className={`${estilos.insignia} ${sesion.overtime_status === "approved" ? estilos.exito : estilos.peligro}`}>{sesion.overtime_status === "approved" ? "Aprobada" : "Rechazada"}</span>{sesion.overtime_auto_approved && <small>Decisión automática</small>}</td><td>{sesion.overtime_review_note || "Sin anotación"}</td><td>{sesion.overtime_status === "rejected" ? (sesion.overtime_rejection_penalized ? "Sí" : "No") : "No aplica"}</td><td>{sesion.overtime_reviewed_by_name || (sesion.overtime_auto_approved ? "Sistema" : "No disponible")}</td><td><button type="button" className={estilos.botonSecundario} onClick={() => setDetalle(sesion)}>Ver registro</button></td></tr>)}{!recurso.cargando && !historial.length && <tr><td colSpan={8} className={estilos.vacio}>Todavía no hay decisiones de horas extra registradas.</td></tr>}</tbody></table></div><Paginacion {...paginacionHistorial} total={historial.length} /></section>

    {detalle && <div className={estilos.fondoModal}><section className={`${estilos.modal} ${estilos.modalDetalleHoraExtra}`} role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-extra"><header><div><h2 id="titulo-detalle-extra">Registro completo de hora extra</h2><p>{detalle.monitor_name} · {detalle.work_day}</p></div><button type="button" onClick={() => setDetalle(null)}>×</button></header><div className={estilos.detalleHoraExtra}><Dato etiqueta="Entrada real" valor={hora(detalle.actual_start)} /><Dato etiqueta="Salida real" valor={hora(detalle.actual_end)} /><Dato etiqueta="Entrada normalizada" valor={hora(detalle.normalized_start)} /><Dato etiqueta="Salida normalizada" valor={hora(detalle.normalized_end)} /><Dato etiqueta="Horario programado" valor={`${fechaHora(detalle.scheduled_start)} – ${fechaHora(detalle.scheduled_end)}`} ancho /><Dato etiqueta="Horas normales" valor={horas(detalle.normal_minutes)} /><Dato etiqueta="Horas extra" valor={horas(detalle.overtime_minutes)} /><Dato etiqueta="Retraso" valor={horas(detalle.late_minutes)} /><Dato etiqueta="Estado de hora extra" valor={({ pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada", not_applicable: "No aplica" } as const)[detalle.overtime_status]} /><Dato etiqueta="Anotación de la decisión" valor={detalle.overtime_review_note || "Sin anotación"} ancho /><Dato etiqueta="Revisado por" valor={detalle.overtime_reviewed_by_name || "No disponible"} /><Dato etiqueta="Fecha de revisión" valor={fechaHora(detalle.overtime_reviewed_at)} /><Dato etiqueta="Penalización aplicada" valor={detalle.overtime_status === "rejected" ? (detalle.overtime_rejection_penalized ? "Sí" : "No") : "No aplica"} /></div></section></div>}

    {modalDecision && <div className={estilos.fondoModal}><section className={`${estilos.modal} ${estilos.modalDecisionHoraExtra}`} role="dialog" aria-modal="true" aria-labelledby="titulo-decision-extra"><header><div><span className={estilos.etiqueta}>{modalDecision.modo === "approve" ? "Aprobación" : "Rechazo"}</span><h2 id="titulo-decision-extra">{modalDecision.modo === "approve" ? "Aprobar y guardar" : "Rechazar horas extra"}</h2><p>{modalDecision.sesion.monitor_name} · {horas(modalDecision.sesion.overtime_minutes)}</p></div><button type="button" onClick={() => setModalDecision(null)}>×</button></header><div className={estilos.formulario}><label className={estilos.campo}><span>Anotación {modalDecision.modo === "reject" ? "obligatoria" : "opcional"}</span><textarea required={modalDecision.modo === "reject"} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={modalDecision.modo === "reject" ? "Explique el motivo del rechazo" : "Agregue una observación si lo considera necesario"} /></label>{modalDecision.modo === "reject" && <fieldset className={estilos.selectorPenalizacion}><legend>¿Se penaliza al monitor?</legend><label><input type="radio" name="penalizacion-extra" checked={penalizar} onChange={() => setPenalizar(true)} />Sí, descontar el mismo tiempo</label><label><input type="radio" name="penalizacion-extra" checked={!penalizar} onChange={() => setPenalizar(false)} />No, solamente rechazar</label></fieldset>}<div className={estilos.accionesModalDecision}><button type="button" className={estilos.botonSecundario} onClick={() => setModalDecision(null)}>Cancelar</button><button type="button" className={modalDecision.modo === "approve" ? estilos.aprobarExtra : estilos.rechazarExtra} disabled={procesando === modalDecision.sesion.id || (modalDecision.modo === "reject" && !nota.trim())} onClick={() => void guardarDecision()}>{procesando ? "Guardando…" : modalDecision.modo === "approve" ? "Aprobar y guardar" : "Confirmar rechazo"}</button></div></div></section></div>}
  </div>;
}

function Dato({ etiqueta, valor, ancho = false }: { etiqueta: string; valor: string; ancho?: boolean }) {
  return <article className={ancho ? estilos.datoHoraExtraAncho : undefined}><span>{etiqueta}</span><strong>{valor}</strong></article>;
}
