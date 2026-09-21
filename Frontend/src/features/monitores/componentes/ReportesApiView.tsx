"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { MonitorApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { AvisoTemporal } from "./AvisoTemporal";
import { Paginacion } from "./Paginacion";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import estilos from "./SistemaVisualMonitores.module.css";
import estilosPestanas from "./PestanasActas.module.css";

type Tipo = "memorandos" | "actas";
type Fila = Record<string, unknown>;
const dependencias: Record<string, string> = {
  informatics_labs: "Monitores Aulas de Software",
  electrical: "Monitores Laboratorios",
  physics: "Monitores Física",
};
const fecha = (valor: unknown) =>
  !valor
    ? "Sin envío"
    : new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(valor)));

export function ReportesApiView({ tipo }: { tipo: Tipo }) {
  const [rows, setRows] = useState<Fila[]>([]);
  const [monitores, setMonitores] = useState<MonitorApi[]>([]);
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("todos");
  const [dependencia, setDependencia] = useState("todas");
  const [filtros, setFiltros] = useState({
    buscar: "",
    estado: "todos",
    dependencia: "todas",
  });
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [procesando, setProcesando] = useState("");
  const [vistaActas, setVistaActas] = useState<"ACTUAL" | "HISTORICO">("ACTUAL");
  const [semestreHistorico, setSemestreHistorico] = useState("");
  const [actaPorRechazar, setActaPorRechazar] = useState<Fila | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const cargarDocumentos = useCallback(async () => {
    try {
      const listaMonitores = await servicioMonitores.listarMonitores();
      setMonitores(listaMonitores);
      if (tipo === "actas" && vistaActas === "HISTORICO" && !semestreHistorico) {
        setRows([]);
        return;
      }
      const documentos =
        tipo === "memorandos"
          ? await servicioMonitores.listarMemorandos()
          : await servicioMonitores.listarActasCompromiso(
              vistaActas === "HISTORICO" ? semestreHistorico : undefined,
            );
      setRows(documentos as Fila[]);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible cargar los documentos.",
      );
    }
  }, [tipo, vistaActas, semestreHistorico]);
  useEffect(() => {
    void cargarDocumentos();
    const actualizarAlVolver = () => void cargarDocumentos();
    window.addEventListener("focus", actualizarAlVolver);
    const intervalo = window.setInterval(actualizarAlVolver, 60_000);
    return () => {
      window.removeEventListener("focus", actualizarAlVolver);
      window.clearInterval(intervalo);
    };
  }, [cargarDocumentos]);
  const monitorPorId = useMemo(
    () => new Map(monitores.map((monitor) => [monitor.id, monitor])),
    [monitores],
  );
  const filas = useMemo(
    () =>
      rows.filter((row) => {
        const monitor = monitorPorId.get(String(row.monitor));
        if (tipo === "actas") {
          const texto =
            `${row.monitor_name ?? ""} ${row.codigo_estudiante ?? ""} ${monitor?.user_email ?? ""}`.toLocaleLowerCase(
              "es",
            );
          return (
            (!buscar || texto.includes(buscar.toLocaleLowerCase("es"))) &&
            (estado === "todos" ||
              String(row.status ?? "pending").toLowerCase() ===
                estado) &&
            (dependencia === "todas" || monitor?.department === dependencia)
          );
        }
        return (
          (filtros.estado === "todos" ||
            (filtros.estado === "enviado"
              ? Boolean(row.sent_at)
              : !row.sent_at)) &&
          (filtros.dependencia === "todas" ||
            monitor?.department === filtros.dependencia)
        );
      }),
    [rows, tipo, filtros, monitorPorId, buscar, estado, dependencia],
  );
  const paginacionActas = usarPaginacion(filas, 10);
  useEffect(() => {
    if (tipo === "actas") paginacionActas.reiniciar();
  }, [tipo, buscar, estado, dependencia]);
  const abrirPdf = async (row: Fila, firmado = false, descargar = false) => {
    try {
      const blob =
        tipo === "memorandos"
          ? await servicioMonitores.descargarMemorando(String(row.id))
          : firmado
            ? await servicioMonitores.descargarActaFirmada(String(row.monitor))
            : await servicioMonitores.descargarActaCompromiso(
                String(row.monitor),
              );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      if (descargar)
        enlace.download = `Acta_Firmada_${String(row.codigo_estudiante ?? row.monitor)}.pdf`;
      else {
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
      }
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible abrir el PDF.",
      );
    }
  };
  const descargarFirmadas = async () => {
    const firmadas = rows.filter((row) => Boolean(row.has_signed));
    if (!firmadas.length) {
      setError("No hay actas firmadas disponibles para descargar.");
      return;
    }
    setProcesando("firmadas");
    try {
      for (const acta of firmadas) await abrirPdf(acta, true, true);
      setAviso(
        `${firmadas.length} acta(s) firmada(s) enviada(s) para descarga.`,
      );
    } finally {
      setProcesando("");
    }
  };
  const reenviar = async (row: Fila) => {
    setProcesando(String(row.id));
    try {
      const actualizado = await servicioMonitores.reenviarMemorando(
        String(row.id),
      );
      setRows((actual) =>
        actual.map((item) =>
          String(item.id) === String(row.id) ? (actualizado as Fila) : item,
        ),
      );
      setAviso("El memorando fue reenviado correctamente.");
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible reenviar el memorando.",
      );
    } finally {
      setProcesando("");
    }
  };
  const revisarActa = async (row: Fila, action: "accept" | "reject", motivo = "") => {
    setProcesando(String(row.monitor));
    try {
      const actualizado = await servicioMonitores.revisarActaCompromiso(
        String(row.monitor),
        action,
        motivo ?? "",
      );
      setRows((actual) =>
        actual.map((item) =>
          String(item.monitor) === String(row.monitor)
            ? (actualizado as Fila)
            : item,
        ),
      );
      setAviso(
        action === "accept"
          ? "Acta aceptada correctamente."
          : "Acta rechazada correctamente.",
      );
      return true;
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible revisar el acta.",
      );
      return false;
    } finally {
      setProcesando("");
    }
  };
  const abrirRechazo = (row: Fila) => {
    setActaPorRechazar(row);
    setMotivoRechazo("");
  };
  const cerrarRechazo = () => {
    if (procesando) return;
    setActaPorRechazar(null);
    setMotivoRechazo("");
  };
  const confirmarRechazo = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!actaPorRechazar || !motivoRechazo.trim()) return;
    const rechazado = await revisarActa(actaPorRechazar, "reject", motivoRechazo.trim());
    if (rechazado) cerrarRechazo();
  };
  const dependenciasRegistradas = useMemo(
    () => [
      ...new Map(
        monitores
          .filter((monitor) => monitor.department)
          .map((monitor) => [
            monitor.department,
            monitor.department.replaceAll("_", " "),
          ]),
      ).entries(),
    ],
    [monitores],
  );
  const semestresHistoricos = useMemo(
    () =>
      [...new Set(monitores.filter((monitor) => monitor.semester && monitor.semester_is_active === false).map((monitor) => monitor.semester as string))]
        .sort((a, b) => b.localeCompare(a, "es")),
    [monitores],
  );

  if (tipo === "actas") {
    const firmadas = rows.filter((row) => Boolean(row.has_signed)).length;
    return (
      <div className={estilos.actasApi}>
        <section className={`page-heading ${estilos.encabezado}`}>
          <div>
            <span className={estilos.etiqueta}>Gestión documental</span>
            <h1>Actas de compromiso</h1>
            <p>
              Revise las actas enviadas por los monitores para su posterior
              revisión.
            </p>
          </div>
          <div className={estilos.encabezadoAcciones}>
            <button
              type="button"
              className="button-primary"
              disabled={!firmadas || procesando === "firmadas"}
              onClick={() => void descargarFirmadas()}
            >
              {procesando === "firmadas"
                ? "Preparando descargas…"
                : `Descargar firmadas (${firmadas})`}
            </button>
          </div>
        </section>
        {error && (
          <AvisoTemporal
            mensaje={error}
            tipo="error"
            alCerrar={() => setError("")}
          />
        )}
        {aviso && (
          <AvisoTemporal
            mensaje={aviso}
            tipo="exito"
            alCerrar={() => setAviso("")}
          />
        )}
        <section className={estilos.metricas}>
          <article className={`${estilos.metrica} ${estilos.violeta}`}>
            <span>Monitores</span>
            <strong>{rows.length}</strong>
            <small>Actas registradas</small>
          </article>
          <article className={`${estilos.metrica} ${estilos.verde}`}>
            <span>Actas firmadas</span>
            <strong>{firmadas}</strong>
            <small>Documentos cargados</small>
          </article>
          <article className={`${estilos.metrica} ${estilos.ambar}`}>
            <span>Por firmar</span>
            <strong>{rows.length - firmadas}</strong>
            <small>Pendientes de entrega</small>
          </article>
        </section>
        <section className={`${estilos.tarjeta} ${estilos.seguimientoFirmas}`}>
          <header>
            <div>
              <h2>Seguimiento de firmas</h2>
              <p>
                Las actas nuevas quedan pendientes hasta que un administrador o
                líder las revise.
              </p>
            </div>
            <span className={`${estilos.insignia} ${estilos.advertencia}`}>
              {rows.length - firmadas} pendientes
            </span>
          </header>
        </section>
        <section className={estilos.tarjeta}>
          <header className={estilosPestanas.cabeceraPestanas}>
            <div className={estilosPestanas.pestanas} role="tablist" aria-label="Vista de actas">
              <button type="button" role="tab" aria-selected={vistaActas === "ACTUAL"} className={vistaActas === "ACTUAL" ? estilosPestanas.pestanaActiva : ""} onClick={() => { setVistaActas("ACTUAL"); setSemestreHistorico(""); setBuscar(""); setEstado("todos"); setDependencia("todas"); }}>
                Gestión actual <span>{vistaActas === "ACTUAL" ? rows.length : ""}</span>
              </button>
              <button type="button" role="tab" aria-selected={vistaActas === "HISTORICO"} className={vistaActas === "HISTORICO" ? estilosPestanas.pestanaActiva : ""} onClick={() => { setVistaActas("HISTORICO"); setSemestreHistorico(""); setBuscar(""); setEstado("todos"); setDependencia("todas"); }}>
                Historial <span>{semestresHistoricos.length}</span>
              </button>
            </div>
            <div className={estilosPestanas.indicadorVista}><i />{vistaActas === "ACTUAL" ? "Actas del semestre vigente" : "Consulta de periodos archivados"}</div>
          </header>
          {vistaActas === "HISTORICO" && <div className={estilos.barraHerramientas}>
            <label className={estilos.campo}>
              <span>Periodo académico</span>
              <select value={semestreHistorico} onChange={(event) => { setSemestreHistorico(event.target.value); setBuscar(""); setEstado("todos"); setDependencia("todas"); }}>
                <option value="">Seleccione un periodo histórico</option>
                {semestresHistoricos.map((semestre) => <option key={semestre} value={semestre}>{semestre}</option>)}
              </select>
            </label>
            {!semestreHistorico && <p className={estilos.vacio}>Seleccione un periodo académico archivado para consultar sus actas.</p>}
          </div>}
          <div className={estilos.barraHerramientas}>
            <label className={estilos.campoAncho}>
              <span>Buscar</span>
              <input
                value={buscar}
                onChange={(event) => setBuscar(event.target.value)}
                placeholder="Nombre, correo o código"
              />
            </label>
            <label className={estilos.campo}>
              <span>Estado del acta</span>
              <select
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
              >
                <option value="todos">Todas</option>
                <option value="pending">Pendientes de revisión</option>
                <option value="accepted">Aceptadas</option>
                <option value="rejected">Rechazadas</option>
              </select>
            </label>
            <label className={estilos.campo}>
              <span>Dependencia</span>
              <select
                value={dependencia}
                onChange={(event) => setDependencia(event.target.value)}
              >
                <option value="todas">Todas</option>
                {dependenciasRegistradas.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <div className={estilos.accionesFormulario}>
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setBuscar("");
                  setEstado("todos");
                  setDependencia("todas");
                }}
              >
                Restablecer
              </button>
            </div>
          </div>
          <div className={estilos.tablaContenedor}>
            <table className={`${estilos.tabla} ${estilos.tablaActas}`}>
              <thead>
                <tr>
                  <th>Monitor</th>
                  <th>Código</th>
                  <th>Correo</th>
                  <th>Dependencia</th>
                  <th>Estado</th>
                  <th>Archivo firmado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginacionActas.visibles.map((row) => {
                  const monitor = monitorPorId.get(String(row.monitor));
                  const firmada = Boolean(row.has_signed);
                  const estadoActa = String(
                    row.status ?? "pending",
                  ).toLowerCase();
                  const etiqueta =
                    estadoActa === "accepted"
                      ? "Aceptada"
                      : estadoActa === "rejected"
                        ? "Rechazada"
                        : "Pendiente";
                  const tono =
                    estadoActa === "accepted"
                      ? estilos.exito
                      : estadoActa === "rejected"
                        ? estilos.peligro
                        : estilos.advertencia;
                  return (
                    <tr key={String(row.monitor)} className={firmada ? estilos.filaActaFirmada : estilos.filaActaPendiente}>
                      <td>
                        <div className={estilos.identidadActa}>
                          <strong>{String(row.monitor_name ?? "—")}</strong>
                          <small>
                            {monitor?.proyecto_curricular?.replaceAll("_", " ") ??
                              "Programa no registrado"}
                          </small>
                        </div>
                      </td>
                      <td>{String(row.codigo_estudiante ?? "—")}</td>
                      <td className={estilos.correoCuenta}>
                        {monitor?.user_email ?? "Sin correo vinculado"}
                      </td>
                      <td>
                        {monitor?.department?.replaceAll("_", " ") ??
                          "No disponible"}
                      </td>
                      <td>
                        <span className={`${estilos.insignia} ${tono}`}>
                          {etiqueta}
                        </span>
                        {estadoActa === "rejected" && row.rejection_reason ? (
                          <small>{String(row.rejection_reason)}</small>
                        ) : null}
                      </td>
                      <td>
                        {firmada ? (
                          <div className={estilos.archivoFirmadoActa}>
                            <strong title={String(row.signed_file_name || "Archivo firmado")}>
                              {String(
                                row.signed_file_name || "Archivo firmado",
                              )}
                            </strong>
                            <small>PDF · {fecha(row.uploaded_at)}</small>
                            <button
                              type="button"
                              className={estilos.botonSecundario}
                              onClick={() => void abrirPdf(row, true, true)}
                            >
                              Descargar PDF
                            </button>
                          </div>
                        ) : (
                          <div className={estilos.archivoPendienteActa}>
                            <span className={`${estilos.insignia} ${estilos.neutro}`}>Sin archivo</span>
                            <small>El monitor aún no ha cargado el documento.</small>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className={`${estilos.accionesTabla} ${estilos.accionesActa}`}>
                          <button
                            type="button"
                            className={estilos.accionVerActa}
                            onClick={() => void abrirPdf(row)}
                          >
                            Ver documento
                          </button>
                          {!semestreHistorico && estadoActa === "pending" && firmada ? (
                            <>
                              <button
                                type="button"
                                className={estilos.accionAceptarActa}
                                disabled={procesando === String(row.monitor)}
                                onClick={() => void revisarActa(row, "accept")}
                              >
                                Aceptar
                              </button>
                              <button
                                type="button"
                                className={estilos.accionRechazarActa}
                                disabled={procesando === String(row.monitor)}
                                onClick={() => abrirRechazo(row)}
                              >
                                Rechazar
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filas.length && (
                  <tr>
                    <td colSpan={7} className={estilos.vacio}>
                      No hay actas que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion {...paginacionActas} total={filas.length} />
        </section>
        {actaPorRechazar && <div className={estilos.fondoModal} role="presentation" onMouseDown={(evento) => evento.target === evento.currentTarget && cerrarRechazo()}>
          <section className={`${estilos.modal} ${estilos.modalRechazoActa}`} role="dialog" aria-modal="true" aria-labelledby="titulo-rechazo-acta">
            <header>
              <div>
                <span className={estilos.etiqueta}>Revisión de acta</span>
                <h2 id="titulo-rechazo-acta">Rechazar acta firmada</h2>
                <p>Indica el motivo para que {String(actaPorRechazar.monitor_name ?? "el monitor")} pueda corregirla y enviarla nuevamente.</p>
              </div>
              <button type="button" onClick={cerrarRechazo} aria-label="Cerrar" disabled={Boolean(procesando)}>×</button>
            </header>
            <form onSubmit={(evento) => void confirmarRechazo(evento)}>
              <label className={estilos.campo}>
                <span>Motivo del rechazo</span>
                <textarea autoFocus required value={motivoRechazo} onChange={(evento) => setMotivoRechazo(evento.target.value)} placeholder="Ejemplo: falta la firma en la última página o el documento no corresponde al periodo académico." rows={4} />
                <small>Este mensaje quedará visible junto al estado Rechazada.</small>
              </label>
              <footer className={estilos.accionesModalRechazo}>
                <button type="button" className={estilos.botonSecundario} onClick={cerrarRechazo} disabled={Boolean(procesando)}>Cancelar</button>
                <button type="submit" className={estilos.accionRechazarActa} disabled={!motivoRechazo.trim() || Boolean(procesando)}>{procesando ? "Rechazando…" : "Rechazar acta"}</button>
              </footer>
            </form>
          </section>
        </div>}
      </div>
    );
  }
  const enviados = rows.filter((row) => Boolean(row.sent_at)).length;
  return (
    <div className={estilos.memorandosApi}>
      <section className={`page-heading ${estilos.encabezado}`}>
        <div>
          <span className={estilos.etiqueta}>Gestión documental</span>
          <h1>Memorandos</h1>
          <p>
            Consulta, filtra y reenvía los memorandos generados por retardos
            acumulados.
          </p>
        </div>
      </section>
      {error && (
        <AvisoTemporal
          mensaje={error}
          tipo="error"
          alCerrar={() => setError("")}
        />
      )}
      {aviso && (
        <AvisoTemporal
          mensaje={aviso}
          tipo="exito"
          alCerrar={() => setAviso("")}
        />
      )}
      <section className={estilos.metricas}>
        <article className={`${estilos.metrica} ${estilos.violeta}`}>
          <span>Generados</span>
          <strong>{rows.length}</strong>
          <small>Memorandos disponibles</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.verde}`}>
          <span>Enviados</span>
          <strong>{enviados}</strong>
          <small>Con correo confirmado</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.ambar}`}>
          <span>Pendientes</span>
          <strong>{rows.length - enviados}</strong>
          <small>Requieren envío</small>
        </article>
      </section>
      <section className={estilos.tarjeta}>
        <header>
          <div>
            <h2>Memorandos generados</h2>
            <p>{filas.length} resultados con los filtros actuales.</p>
          </div>
        </header>
        <div className={estilos.barraHerramientas}>
          <label className={estilos.campo}>
            <span>Estado</span>
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="enviado">Enviado</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </label>
          <label className={estilos.campo}>
            <span>Dependencia</span>
            <select
              value={dependencia}
              onChange={(event) => setDependencia(event.target.value)}
            >
              <option value="todas">Todas</option>
              {Object.entries(dependencias).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button-primary"
            onClick={() => setFiltros({ buscar: "", estado, dependencia })}
          >
            Filtrar
          </button>
        </div>
        <div className={estilos.tablaContenedor}>
          <table className={`${estilos.tabla} ${estilos.tablaMemorandos}`}>
            <thead>
              <tr>
                <th>Monitor</th>
                <th>Retardos</th>
                <th>Correo actual</th>
                <th>Envío</th>
                <th>PDF</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((row) => {
                const enviado = Boolean(row.sent_at);
                return (
                  <tr key={String(row.id)}>
                    <td>
                      <strong>{String(row.monitor_name ?? "—")}</strong>
                      <small>
                        {String(row.codigo_estudiante ?? "Sin código")}
                      </small>
                    </td>
                    <td>{String(row.late_count_threshold ?? 0)}</td>
                    <td>{String(row.sent_to ?? "Sin correo")}</td>
                    <td>
                      <span
                        className={`${estilos.insignia} ${enviado ? estilos.exito : estilos.advertencia}`}
                      >
                        {enviado ? "Enviado" : "Pendiente"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={estilos.botonSecundario}
                        type="button"
                        onClick={() => void abrirPdf(row)}
                      >
                        Abrir PDF
                      </button>
                    </td>
                    <td>
                      <button
                        className={estilos.botonSecundario}
                        type="button"
                        disabled={procesando === String(row.id)}
                        onClick={() => void reenviar(row)}
                      >
                        Reenviar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
