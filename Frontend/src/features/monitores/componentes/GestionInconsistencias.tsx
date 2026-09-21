"use client";

import { Fragment, useState } from "react";
import type { DetalleInconsistenciaApi, InconsistenciaApi, MarcacionCercanaInconsistenciaApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { AvisoTemporal } from "./AvisoTemporal";
import estilos from "./SistemaVisualMonitores.module.css";

function formatoHoras(minutos: number) {
  const horas = minutos / 60;
  return `${Number.isInteger(horas) ? horas : horas.toFixed(2)} h`;
}

function formatoFechaHora(valor: string | null) {
  return valor ? new Date(valor).toLocaleString("es-CO") : "Sin hora";
}

function tonoMarcacion(estado: string) {
  if (estado === "paired") return estilos.exito;
  if (estado === "duplicate_ignored") return estilos.advertencia;
  if (estado === "unpaired") return estilos.peligro;
  return estilos.neutro;
}

function relacionMarcacion(marca: MarcacionCercanaInconsistenciaApi) {
  if (marca.duplicate_of) return `Duplicado de ${marca.duplicate_of.slice(0, 8)}`;
  if (marca.paired_record) return `Emparejado con ${marca.paired_record.slice(0, 8)}`;
  return "Sin relación";
}

function DetalleInconsistencia({ detalle }: { detalle: DetalleInconsistenciaApi }) {
  return (
    <section className={estilos.detalleInconsistencia}>
      <header className={estilos.cabeceraDetalleInconsistencia}>
        <div>
          <strong>Marcaciones y horarios cercanos</strong>
          <span>{detalle.weekday}, {detalle.work_day} · {detalle.monitor_name || detalle.raw_full_name}</span>
        </div>
        <span className={`${estilos.insignia} ${tonoMarcacion(detalle.pairing_status)}`}>{detalle.pairing_status_label}</span>
      </header>

      <div className={estilos.rejillaDetalleInconsistencia}>
        <article className={estilos.bloqueDetalleInconsistencia}>
          <h3>Horarios asignados</h3>
          {detalle.nearby_schedules.length ? detalle.nearby_schedules.map(horario => (
            <div key={horario.id} className={estilos.filaDetalleInconsistencia}>
              <strong>{horario.start_time.slice(0, 5)}–{horario.end_time.slice(0, 5)} · {formatoHoras(horario.assigned_minutes)}</strong>
              <span>{horario.asignatura || "Sin asignatura"}{horario.grupo ? ` · Grupo ${horario.grupo}` : ""}</span>
              <small>{horario.docente || "Sin docente"} · {horario.location || "Sin ubicación"}</small>
            </div>
          )) : <p>No hay bloques activos para este día.</p>}
        </article>

        <article className={estilos.bloqueDetalleInconsistencia}>
          <h3>Marcaciones del día</h3>
          {detalle.nearby_marks.length ? detalle.nearby_marks.map(marca => (
            <div key={marca.id} className={`${estilos.filaDetalleInconsistencia} ${marca.is_current ? estilos.filaDetalleActual : ""}`}>
              <div className={estilos.estadoMarcacion}>
                <strong>{formatoFechaHora(marca.event_at)}</strong>
                <span className={`${estilos.insignia} ${tonoMarcacion(marca.pairing_status)}`}>{marca.pairing_status_label}</span>
              </div>
              <span>{relacionMarcacion(marca)}</span>
              <small>{marca.pairing_reason || marca.operation || "Sin observación"}</small>
            </div>
          )) : <p>No se encontraron marcaciones cercanas.</p>}
        </article>

        <article className={estilos.bloqueDetalleInconsistencia}>
          <h3>Información y gestión</h3>
          <div className={estilos.filaDetalleInconsistencia}>
            <strong>{detalle.inconsistency_type_label}</strong>
            <span>{detalle.department_label || detalle.raw_department}</span>
            <small>{detalle.message}</small>
          </div>
          {detalle.work_session && (
            <div className={estilos.filaDetalleInconsistencia}>
              <strong>Sesión derivada · {detalle.work_session.session_state}</strong>
              <span>Normal: {formatoHoras(detalle.work_session.normal_minutes)} · Extra: {formatoHoras(detalle.work_session.overtime_minutes)}</span>
              <small>{detalle.work_session.invalidation_reason || "Sesión vigente"}</small>
            </div>
          )}
          {detalle.events.map(evento => (
            <div key={evento.id} className={estilos.filaDetalleInconsistencia}>
              <strong>{evento.action_label}</strong>
              <span>{evento.actor_name} · {formatoFechaHora(evento.created_at)}</span>
              <small>{evento.note || "Sin nota"}</small>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}

export function GestionInconsistencias() {
  const recurso = usarRecursoApi(servicioMonitores.listarInconsistencias, [] as InconsistenciaApi[]);
  const indicadores = usarRecursoApi(servicioMonitores.obtenerIndicadoresInconsistencias, { pending_reconciliation: 0, marking_errors: 0 });
  const [nota, setNota] = useState<Record<string, string>>({});
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState("");
  const [aviso, setAviso] = useState("");
  const [detalle, setDetalle] = useState<DetalleInconsistenciaApi | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState("");

  const verDetalle = async (item: InconsistenciaApi) => {
    if (detalle?.id === item.id) { setDetalle(null); return; }
    setCargandoDetalle(item.id);
    setAviso("");
    try { setDetalle(await servicioMonitores.obtenerDetalleInconsistencia(item.id)); }
    catch (error) { setAviso(error instanceof Error ? error.message : "No fue posible consultar el detalle."); }
    finally { setCargandoDetalle(""); }
  };

  const resolver = async (item: InconsistenciaApi) => {
    const descripcion = nota[item.id]?.trim();
    if (!descripcion) { setAviso("Escriba el motivo de la solución."); return; }
    setProcesando(item.id);
    try {
      const actualizada = await servicioMonitores.crearSolucionInconsistencia(item.id, {
        annotation_type: "missing_punch",
        action: "add",
        delta_minutes: Math.round(Number(horas[item.id] || 0) * 60),
        description: descripcion,
      });
      recurso.setDatos(actual => actual.map(fila => fila.id === item.id ? actualizada : fila));
      setDetalle(await servicioMonitores.obtenerDetalleInconsistencia(item.id));
      setAviso("Se creó y vinculó la anotación de solución. Puede invalidar la marcación si corresponde.");
      await indicadores.recargar();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No fue posible crear la solución.");
    } finally { setProcesando(""); }
  };

  const invalidar = async (item: InconsistenciaApi) => {
    const motivo = nota[item.id]?.trim();
    if (!motivo) { setAviso("Escriba el motivo de invalidación."); return; }
    setProcesando(item.id);
    try {
      await servicioMonitores.invalidarInconsistencia(item.id, motivo);
      recurso.setDatos(actual => actual.filter(fila => fila.id !== item.id));
      if (detalle?.id === item.id) setDetalle(null);
      setAviso("Registro invalidado correctamente.");
      await indicadores.recargar();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No fue posible invalidar el registro.");
    } finally { setProcesando(""); }
  };

  return <>
    <section className={`page-heading ${estilos.encabezado}`}>
      <div><span className={estilos.etiqueta}>Control de asistencia</span><h1>Inconsistencias</h1><p>Errores automáticos de marcación: pares cortos, marcas impares, fuera de jornada y duplicados.</p></div>
      <div className={estilos.accionesTabla}>
        <span className={`${estilos.insignia} ${estilos.advertencia}`}>Por conciliar: {indicadores.datos.pending_reconciliation}</span>
        <span className={`${estilos.insignia} ${estilos.peligro}`}>Errores marcación: {indicadores.datos.marking_errors}</span>
      </div>
    </section>
    {(recurso.error || indicadores.error) && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{recurso.error || indicadores.error}</div>}
    {aviso && <AvisoTemporal mensaje={aviso} tipo={aviso.includes("correctamente") || aviso.startsWith("Se ") ? "exito" : "error"} alCerrar={() => setAviso("")} />}
    <section className={estilos.tarjeta}>
      <header><div><h2>Errores automáticos de marcación</h2><p>Revise las marcaciones y horarios cercanos; resuelva con una anotación o invalide el registro cuando corresponda.</p></div></header>
      <div className={estilos.tablaContenedor}>
        <table className={estilos.tabla}>
          <thead><tr><th>Monitor</th><th>Fecha</th><th>Marcación</th><th>Error</th><th>Gestión</th></tr></thead>
          <tbody>
            {recurso.datos.map(item => <Fragment key={item.id}>
              <tr>
                <td><strong>{item.monitor_name || item.raw_full_name}</strong><small>{item.monitor_code || item.raw_department} · {item.department_label || item.raw_department}</small></td>
                <td>{item.weekday}<small>{item.work_day}</small></td>
                <td>{formatoFechaHora(item.event_at)}<small><span className={`${estilos.insignia} ${tonoMarcacion(item.pairing_status)}`}>{item.pairing_status_label}</span></small></td>
                <td><strong>{item.inconsistency_type_label}</strong><small>{item.message}</small></td>
                <td><div className={estilos.gestionInconsistencia}>
                  <button type="button" className={estilos.botonSecundario} disabled={cargandoDetalle === item.id} onClick={() => void verDetalle(item)}>{detalle?.id === item.id ? "Ocultar detalle" : cargandoDetalle === item.id ? "Cargando…" : "Ver detalle"}</button>
                  <input type="number" min="0" max="24" step="0.01" placeholder="Horas" value={horas[item.id] ?? ""} onChange={e => setHoras({ ...horas, [item.id]: e.target.value })}/>
                  <input placeholder="Motivo de solución o invalidación" value={nota[item.id] ?? ""} onChange={e => setNota({ ...nota, [item.id]: e.target.value })}/>
                  <div className={estilos.accionesTabla}>
                    <button type="button" disabled={procesando === item.id || !item.monitor || Boolean(item.solution_annotation)} onClick={() => void resolver(item)}>Crear anotación</button>
                    <button type="button" className={estilos.eliminar} disabled={procesando === item.id || !item.solution_annotation} onClick={() => void invalidar(item)}>Invalidar registro</button>
                  </div>
                </div></td>
              </tr>
              {detalle?.id === item.id && <tr><td colSpan={5}><DetalleInconsistencia detalle={detalle}/></td></tr>}
            </Fragment>)}
            {!recurso.cargando && !recurso.datos.length && <tr><td colSpan={5} className={estilos.vacio}>No hay inconsistencias pendientes.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}

