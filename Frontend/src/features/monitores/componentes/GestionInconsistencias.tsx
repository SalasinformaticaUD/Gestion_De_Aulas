"use client";

import { Fragment, useMemo, useState } from "react";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import type {
  DetalleInconsistenciaApi,
  InconsistenciaApi,
  MarcacionCercanaInconsistenciaApi,
} from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { AvisoTemporal } from "./AvisoTemporal";
import { Paginacion } from "./Paginacion";
import estilos from "./SistemaVisualMonitores.module.css";

type Vista = "PENDIENTES" | "HISTORIAL" | "DUPLICADOS";
type ModalAccion = {
  modo: "solucion" | "invalidacion";
  item: InconsistenciaApi;
} | null;
const tipos = [
  ["odd_mark", "Marcación impar"],
  ["short_pair", "Par corto"],
  ["out_of_day_window", "Fuera de jornada"],
  ["duplicate_mark", "Duplicado"],
  ["end_of_day", "Final de jornada"],
] as const;
const dependencias = [
  ["physics", "Monitores Física"],
  ["informatics_labs", "Monitores Aulas de Software"],
  ["electrical", "Monitores Laboratorios"],
] as const;

function formatoHoras(minutos: number) {
  const horas = minutos / 60;
  return `${Number.isInteger(horas) ? horas : horas.toFixed(2)} h`;
}
function formatoFechaHora(valor: string | null) {
  return valor ? new Date(valor).toLocaleString("es-CO") : "Sin hora";
}
function tonoMarcacion(estado: string) {
  return estado === "paired"
    ? estilos.exito
    : estado === "duplicate_ignored"
      ? estilos.advertencia
      : estado === "unpaired"
        ? estilos.peligro
        : estilos.neutro;
}
function relacionMarcacion(marca: MarcacionCercanaInconsistenciaApi) {
  return marca.duplicate_of
    ? `Duplicado de ${marca.duplicate_of.slice(0, 8)}`
    : marca.paired_record
      ? `Emparejado con ${marca.paired_record.slice(0, 8)}`
      : "Sin relación";
}

function DetalleInconsistencia({
  detalle,
}: {
  detalle: DetalleInconsistenciaApi;
}) {
  return (
    <section className={estilos.detalleInconsistencia}>
      <header className={estilos.cabeceraDetalleInconsistencia}>
        <div>
          <strong>Detalle de la inconsistencia</strong>
          <span>
            {detalle.weekday}, {detalle.work_day} ·{" "}
            {detalle.monitor_name || detalle.raw_full_name}
          </span>
        </div>
        <span
          className={`${estilos.insignia} ${tonoMarcacion(detalle.pairing_status)}`}
        >
          {detalle.pairing_status_label}
        </span>
      </header>
      <div className={estilos.rejillaDetalleInconsistencia}>
        <article className={estilos.bloqueDetalleInconsistencia}>
          <h3>Horarios</h3>
          {detalle.nearby_schedules.length ? (
            detalle.nearby_schedules.map((horario) => (
              <div
                key={horario.id}
                className={estilos.filaDetalleInconsistencia}
              >
                <strong>
                  {horario.start_time.slice(0, 5)}–
                  {horario.end_time.slice(0, 5)} ·{" "}
                  {formatoHoras(horario.assigned_minutes)}
                </strong>
                <span>
                  {horario.asignatura || "Sin asignatura"}
                  {horario.grupo ? ` · Grupo ${horario.grupo}` : ""}
                </span>
                <small>
                  {horario.docente || "Sin docente"} ·{" "}
                  {horario.location || "Sin ubicación"}
                </small>
              </div>
            ))
          ) : (
            <p>No hay bloques activos para este día.</p>
          )}
        </article>
        <article className={estilos.bloqueDetalleInconsistencia}>
          <h3>Marcaciones</h3>
          {detalle.nearby_marks.length ? (
            detalle.nearby_marks.map((marca) => (
              <div
                key={marca.id}
                className={`${estilos.filaDetalleInconsistencia} ${marca.is_current ? estilos.filaDetalleActual : ""}`}
              >
                <div className={estilos.estadoMarcacion}>
                  <strong>{formatoFechaHora(marca.event_at)}</strong>
                  <span
                    className={`${estilos.insignia} ${tonoMarcacion(marca.pairing_status)}`}
                  >
                    {marca.pairing_status_label}
                  </span>
                </div>
                <span>{relacionMarcacion(marca)}</span>
                <small>
                  {marca.pairing_reason || marca.operation || "Sin observación"}
                </small>
              </div>
            ))
          ) : (
            <p>No se encontraron marcaciones cercanas.</p>
          )}
        </article>
        <article className={estilos.bloqueDetalleInconsistencia}>
          <h3>Información y gestión</h3>
          <div className={estilos.filaDetalleInconsistencia}>
            <strong>
              {detalle.inconsistency_type_label} · {detalle.status_label}
            </strong>
            <span>{detalle.department_label || detalle.raw_department}</span>
            <small>{detalle.message}</small>
          </div>
          {detalle.work_session && (
            <div className={estilos.filaDetalleInconsistencia}>
              <strong>Sesión: {detalle.work_session.session_state}</strong>
              <span>
                Normal: {formatoHoras(detalle.work_session.normal_minutes)} ·
                Extra: {formatoHoras(detalle.work_session.overtime_minutes)}
              </span>
              <small>
                {detalle.work_session.invalidation_reason || "Sesión vigente"}
              </small>
            </div>
          )}
          {detalle.events.map((evento) => (
            <div key={evento.id} className={estilos.filaDetalleInconsistencia}>
              <strong>{evento.action_label}</strong>
              <span>
                {evento.actor_name} · {formatoFechaHora(evento.created_at)}
              </span>
              <small>{evento.note || "Sin nota"}</small>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}

export function GestionInconsistencias() {
  const roles = obtenerSesion()?.usuario.roles ?? [];
  const esAdmin = roles.some((rol) =>
    ["admin", "administrador"].includes(rol.trim().toLowerCase()),
  );
  const pendientes = usarRecursoApi(
    servicioMonitores.listarInconsistencias,
    [] as InconsistenciaApi[],
  );
  const historial = usarRecursoApi(
    servicioMonitores.listarHistorialInconsistencias,
    [] as InconsistenciaApi[],
  );
  const duplicados = usarRecursoApi(
    servicioMonitores.listarDuplicadosInconsistencias,
    [] as InconsistenciaApi[],
  );
  const indicadores = usarRecursoApi(
    servicioMonitores.obtenerIndicadoresInconsistencias,
    { pending_reconciliation: 0, marking_errors: 0, pending_by_type: {} },
  );
  const [vista, setVista] = useState<Vista>("PENDIENTES");
  const [buscar, setBuscar] = useState("");
  const [dependencia, setDependencia] = useState("");
  const [procesando, setProcesando] = useState("");
  const [aviso, setAviso] = useState("");
  const [detalle, setDetalle] = useState<DetalleInconsistenciaApi | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState("");
  const [modalAccion, setModalAccion] = useState<ModalAccion>(null);
  const [horas, setHoras] = useState("0");
  const [motivo, setMotivo] = useState("");
  const datosVista =
    vista === "PENDIENTES"
      ? pendientes.datos
      : vista === "HISTORIAL"
        ? historial.datos
        : duplicados.datos;
  const filtradas = useMemo(
    () =>
      datosVista.filter((item) => {
        const texto = buscar.trim().toLocaleLowerCase("es");
        return (
          (!texto ||
            `${item.monitor_name || item.raw_full_name} ${item.monitor_code || ""}`
              .toLocaleLowerCase("es")
              .includes(texto)) &&
          (!dependencia || item.department === dependencia)
        );
      }),
    [buscar, datosVista, dependencia],
  );
  const paginacion = usarPaginacion(filtradas, 8);
  const recargarTodo = async () => {
    await Promise.all([
      pendientes.recargar(),
      historial.recargar(),
      duplicados.recargar(),
      indicadores.recargar(),
    ]);
  };
  const cambiarVista = (nuevaVista: Vista) => {
    setVista(nuevaVista);
    setDetalle(null);
    paginacion.reiniciar();
  };
  const filtrar = (actualizar: () => void) => {
    actualizar();
    paginacion.reiniciar();
  };
  const verDetalle = async (item: InconsistenciaApi) => {
    if (detalle?.id === item.id) {
      setDetalle(null);
      return;
    }
    setCargandoDetalle(item.id);
    setAviso("");
    try {
      setDetalle(await servicioMonitores.obtenerDetalleInconsistencia(item.id));
    } catch (error) {
      setAviso(
        error instanceof Error
          ? error.message
          : "No fue posible consultar el detalle.",
      );
    } finally {
      setCargandoDetalle("");
    }
  };
  const abrirAccion = (
    modo: "solucion" | "invalidacion",
    item: InconsistenciaApi,
  ) => {
    setAviso("");
    setHoras("0");
    setMotivo("");
    setModalAccion({ modo, item });
  };
  const guardarAccion = async () => {
    if (!modalAccion) return;
    const descripcion = motivo.trim();
    if (!descripcion) {
      setAviso(
        modalAccion.modo === "solucion"
          ? "Escriba el motivo de la solución."
          : "Escriba el motivo de invalidación.",
      );
      return;
    }
    const item = modalAccion.item;
    setProcesando(item.id);
    try {
      if (modalAccion.modo === "solucion")
        await servicioMonitores.crearSolucionInconsistencia(item.id, {
          annotation_type: "missing_punch",
          action: "add",
          delta_minutes: Math.round(Number(horas || 0) * 60),
          description: descripcion,
        });
      else
        await servicioMonitores.invalidarInconsistencia(item.id, descripcion);
      setAviso(
        modalAccion.modo === "solucion"
          ? "Se creó y vinculó la anotación de solución."
          : "Registro invalidado correctamente.",
      );
      setModalAccion(null);
      setDetalle(null);
      await recargarTodo();
    } catch (error) {
      setAviso(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la inconsistencia.",
      );
    } finally {
      setProcesando("");
    }
  };
  const resumenPendiente = pendientes.datos.filter(
    (item) => !dependencia || item.department === dependencia,
  );

  return (
    <>
      <section className={`page-heading ${estilos.encabezado}`}>
        <div>
          <span className={estilos.etiqueta}>Control de asistencia</span>
          <h1>Inconsistencias</h1>
          <p>
            Revise y resuelva novedades detectadas en las marcaciones de
            asistencia.
          </p>
        </div>
        <span className={`${estilos.insignia} ${estilos.advertencia}`}>
          {resumenPendiente.length} pendientes
        </span>
      </section>
      <section
        className={`${estilos.metricas} ${estilos.metricasInconsistencias}`}
      >
        <article className={`${estilos.metrica} ${estilos.metricaAmbar}`}>
          <span>Inconsistencias pendientes</span>
          <strong>{resumenPendiente.length}</strong>
          <small>Requieren revisión o resolución</small>
        </article>
        {tipos.map(([tipo, etiqueta]) => (
          <article
            className={`${estilos.metrica} ${estilos.metricaInconsistencia}`}
            key={tipo}
          >
            <span>{etiqueta}</span>
            <strong>
              {
                resumenPendiente.filter(
                  (item) => item.inconsistency_type === tipo,
                ).length
              }
            </strong>
            <small>Pendiente(s) de este tipo</small>
          </article>
        ))}
      </section>
      {(pendientes.error ||
        historial.error ||
        duplicados.error ||
        indicadores.error) && (
        <div className={`${estilos.aviso} ${estilos.avisoError}`}>
          {pendientes.error ||
            historial.error ||
            duplicados.error ||
            indicadores.error}
        </div>
      )}
      {aviso && (
        <AvisoTemporal
          mensaje={aviso}
          tipo={
            aviso.includes("correctamente") || aviso.startsWith("Se ")
              ? "exito"
              : "error"
          }
          alCerrar={() => setAviso("")}
        />
      )}
      <section className={estilos.tarjeta}>
        <header>
          <div>
            <h2>
              {vista === "PENDIENTES"
                ? "Inconsistencias pendientes"
                : vista === "HISTORIAL"
                  ? "Historial de inconsistencias"
                  : "Marcaciones duplicadas"}
            </h2>
            <p>
              {vista === "PENDIENTES"
                ? "Resuelva la anotación o invalide el registro según corresponda."
                : vista === "HISTORIAL"
                  ? "Consulte las inconsistencias resueltas, invalidadas o descartadas."
                  : "Consulte las marcaciones detectadas como duplicadas."}
            </p>
          </div>
        </header>
        <div className={estilos.pestanas}>
          <button
            type="button"
            className={vista === "PENDIENTES" ? estilos.pestanaActiva : ""}
            onClick={() => cambiarVista("PENDIENTES")}
          >
            Pendientes <small>{pendientes.datos.length}</small>
          </button>
          <button
            type="button"
            className={vista === "HISTORIAL" ? estilos.pestanaActiva : ""}
            onClick={() => cambiarVista("HISTORIAL")}
          >
            Historial
          </button>
          <button
            type="button"
            className={vista === "DUPLICADOS" ? estilos.pestanaActiva : ""}
            onClick={() => cambiarVista("DUPLICADOS")}
          >
            Duplicados <small>{duplicados.datos.length}</small>
          </button>
        </div>
        <div className={estilos.barraHerramientas}>
          <label className={estilos.campoAncho}>
            <span>Buscar inconsistencia</span>
            <input
              value={buscar}
              onChange={(e) => filtrar(() => setBuscar(e.target.value))}
              placeholder="Nombre o código del monitor"
            />
          </label>
          {esAdmin && (
            <label className={estilos.campo}>
              <span>Dependencia</span>
              <select
                value={dependencia}
                onChange={(e) => filtrar(() => setDependencia(e.target.value))}
              >
                <option value="">Todas las dependencias</option>
                {dependencias.map(([valor, etiqueta]) => (
                  <option value={valor} key={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={estilos.tablaContenedor}>
          <table className={`${estilos.tabla} ${estilos.tablaInconsistencias}`}>
            <thead>
              <tr>
                <th>Monitor</th>
                <th>Fecha y marca</th>
                <th>Error</th>
                <th>Estado</th>
                <th>Resolución</th>
                <th>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((item) => (
                <Fragment key={item.id}>
                  <tr>
                    <td>
                      <strong>{item.monitor_name || item.raw_full_name}</strong>
                      <small>
                        {item.monitor_code || "Sin código"} ·{" "}
                        {item.department_label || item.raw_department}
                      </small>
                    </td>
                    <td>
                      <strong>{item.work_day}</strong>
                      <small>
                        {formatoFechaHora(item.event_at)} ·{" "}
                        {item.pairing_status_label}
                      </small>
                    </td>
                    <td>
                      <strong>{item.inconsistency_type_label}</strong>
                      <small>{item.message}</small>
                    </td>
                    <td>
                      <span
                        className={`${estilos.insignia} ${item.status === "resolved" ? estilos.exito : item.status === "dismissed" ? estilos.neutro : estilos.advertencia}`}
                      >
                        {item.status_label}
                      </span>
                    </td>
                    <td>
                      {item.solution_annotation_description ? (
                        <>
                          <strong>
                            Anotación · {formatoHoras(item.solution_annotation_delta_minutes ?? 0)}
                          </strong>
                          <small>{item.solution_annotation_description}</small>
                        </>
                      ) : item.resolution_note ? (
                        <>
                          <strong>Motivo registrado</strong>
                          <small>{item.resolution_note}</small>
                        </>
                      ) : (
                        <small>Sin resolución registrada.</small>
                      )}
                    </td>
                    <td>
                      <div className={estilos.accionesInconsistencia}>
                        <button
                          type="button"
                          className={estilos.botonSecundario}
                          disabled={cargandoDetalle === item.id}
                          onClick={() => void verDetalle(item)}
                        >
                          {detalle?.id === item.id
                            ? "Ocultar"
                            : cargandoDetalle === item.id
                              ? "Cargando…"
                              : "Ver detalle"}
                        </button>
                        {vista === "PENDIENTES" && (
                          <>
                            <button
                              type="button"
                              disabled={
                                procesando === item.id ||
                                !item.monitor ||
                                Boolean(item.solution_annotation)
                              }
                              onClick={() => abrirAccion("solucion", item)}
                            >
                              Crear anotación
                            </button>
                            <button
                              type="button"
                              className={estilos.eliminar}
                              disabled={procesando === item.id}
                              onClick={() => abrirAccion("invalidacion", item)}
                            >
                              Invalidar
                            </button>
                          </>
                        )}
                        {vista === "HISTORIAL" && item.solution_annotation && (
                          <button
                            type="button"
                            className={estilos.eliminar}
                            disabled={procesando === item.id}
                            onClick={() => abrirAccion("invalidacion", item)}
                          >
                            Invalidar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {detalle?.id === item.id && (
                    <tr className={estilos.filaDetalleTabla}>
                      <td colSpan={6}>
                        <DetalleInconsistencia detalle={detalle} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!pendientes.cargando &&
                !historial.cargando &&
                !duplicados.cargando &&
                !filtradas.length && (
                  <tr>
                    <td colSpan={6} className={estilos.vacio}>
                      No hay inconsistencias para la selección actual.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        <Paginacion {...paginacion} total={filtradas.length} />
      </section>
      {modalAccion && (
        <div
          className={estilos.fondoModal}
          role="presentation"
          onMouseDown={(evento) =>
            evento.target === evento.currentTarget && setModalAccion(null)
          }
        >
          <section
            className={`${estilos.modal} ${estilos.modalInconsistencia}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-inconsistencia"
          >
            <header>
              <div>
                <h2 id="titulo-modal-inconsistencia">
                  {modalAccion.modo === "solucion"
                    ? "Crear anotación de solución"
                    : "Invalidar registro"}
                </h2>
                <p>
                  {modalAccion.item.monitor_name ||
                    modalAccion.item.raw_full_name}{" "}
                  · {modalAccion.item.work_day}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAccion(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <div className={estilos.formulario}>
              {modalAccion.modo === "solucion" && (
                <label className={estilos.campo}>
                  <span>Horas a ajustar</span>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.01"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                  />
                  <small>
                    Use 0 si la anotación solo documenta la solución.
                  </small>
                </label>
              )}
              <label className={estilos.campo}>
                <span>
                  {modalAccion.modo === "solucion"
                    ? "Motivo de solución"
                    : "Motivo de invalidación"}
                </span>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={
                    modalAccion.modo === "solucion"
                      ? "Explique cómo se resolvió la inconsistencia"
                      : "Explique por qué debe invalidarse el registro"
                  }
                  required
                />
              </label>
              <div className={estilos.accionesModalDecision}>
                <button
                  type="button"
                  className={estilos.botonSecundario}
                  onClick={() => setModalAccion(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={
                    modalAccion.modo === "solucion"
                      ? "button-primary"
                      : estilos.rechazarExtra
                  }
                  disabled={
                    procesando === modalAccion.item.id || !motivo.trim()
                  }
                  onClick={() => void guardarAccion()}
                >
                  {procesando
                    ? "Guardando…"
                    : modalAccion.modo === "solucion"
                      ? "Crear anotación"
                      : "Invalidar registro"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
