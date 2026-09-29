"use client";

import { useCallback, useEffect, useState } from "react";
import {
  actualizarItemSolicitud,
  actualizarSolicitud,
  aprobarSolicitud,
  cargarCatalogosNormalizacion,
  descargarResultadoImportacion,
  descargarSolicitudesFiltradas,
  importarSolicitudes,
  listarSolicitudes,
  obtenerSolicitud,
  previsualizarAprobacion,
  previsualizarSolicitudes,
  rechazarSolicitud,
} from "../api/solicitudesInstalacionApi";
import type {
  CatalogosNormalizacion,
  FiltrosSolicitudes,
  PrevisualizacionAprobacion,
  PrevisualizacionImportacion,
  SeleccionAprobacion,
  SolicitudInstalacion,
} from "../types";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import styles from "./SolicitudesInstalacionView.module.css";

const etiquetasEstado: Record<string, string> = {
  PENDIENTE_REVISION: "Pendiente de revisión",
  REQUIERE_AJUSTES: "Requiere ajustes",
  APROBADA_PARCIAL: "Aprobada parcialmente",
  APROBADA: "Aprobada",
  EN_EJECUCION: "En ejecución",
  FINALIZADA: "Finalizada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

const filtrosIniciales: FiltrosSolicitudes = { vista: "actuales", pagina: 1 };

export function SolicitudesInstalacionView() {
  const [vista, setVista] = useState<"actuales" | "historial" | "importar">(
    "actuales",
  );
  const [filtros, setFiltros] = useState<FiltrosSolicitudes>(filtrosIniciales);
  const [borrador, setBorrador] =
    useState<FiltrosSolicitudes>(filtrosIniciales);
  const [solicitudes, setSolicitudes] = useState<SolicitudInstalacion[]>([]);
  const [meta, setMeta] = useState({ pagina: 1, total: 0, totalPaginas: 1 });
  const [detalle, setDetalle] = useState<SolicitudInstalacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const puedeExportar =
    obtenerSesion()?.usuario.permisos.includes(
      "SOLICITUDES_INSTALACION_EXPORTAR",
    ) ?? false;

  const cargar = useCallback(async () => {
    if (vista === "importar") return;
    setCargando(true);
    try {
      const respuesta = await listarSolicitudes({ ...filtros, vista });
      setSolicitudes(respuesta.data);
      setMeta({
        pagina: respuesta.meta.pagina,
        total: respuesta.meta.total,
        totalPaginas: respuesta.meta.totalPaginas,
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No fue posible cargar las solicitudes.",
      });
    } finally {
      setCargando(false);
    }
  }, [filtros, vista]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarVista = (nueva: typeof vista) => {
    setVista(nueva);
    if (nueva !== "importar") {
      const nuevos = { ...filtros, vista: nueva, pagina: 1 };
      setFiltros(nuevos);
      setBorrador(nuevos);
    }
  };

  const abrirDetalle = async (id: string) => {
    try {
      setDetalle(await obtenerSolicitud(id));
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No fue posible abrir la solicitud.",
      });
    }
  };
  const exportarListado = async () => {
    try {
      descargarBlob(
        await descargarSolicitudesFiltradas(filtros),
        `solicitudes-instalacion-${filtros.vista}.csv`,
      );
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No fue posible exportar las solicitudes.",
      });
    }
  };

  return (
    <>
      <section className={`page-heading ${styles.heading}`}>
        <div>
          <h1>Solicitudes de instalación</h1>
          <p>
            Respuestas del formulario normalizadas, revisables y listas para
            convertirse en trabajo operativo.
          </p>
        </div>
        {vista !== "importar" && (
          <div className={styles.headingActions}>
            {puedeExportar && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void exportarListado()}
              >
                Exportar CSV
              </button>
            )}
            <button
              type="button"
              className="button-primary"
              onClick={() => cambiarVista("importar")}
            >
              Importar Excel
            </button>
          </div>
        )}
      </section>

      {mensaje && (
        <div
          className={`${styles.notice} ${mensaje.tipo === "error" ? styles.error : ""}`}
          role="status"
        >
          <span>{mensaje.texto}</span>
          <button type="button" onClick={() => setMensaje(null)}>
            ×
          </button>
        </div>
      )}

      <nav className={styles.tabs} aria-label="Vistas de solicitudes">
        <button
          type="button"
          className={vista === "actuales" ? styles.active : ""}
          onClick={() => cambiarVista("actuales")}
        >
          Peticiones actuales
        </button>
        <button
          type="button"
          className={vista === "historial" ? styles.active : ""}
          onClick={() => cambiarVista("historial")}
        >
          Historial
        </button>
        <button
          type="button"
          className={vista === "importar" ? styles.active : ""}
          onClick={() => cambiarVista("importar")}
        >
          Importar y revisar
        </button>
      </nav>

      {vista === "importar" ? (
        <Importador
          onImported={() => {
            cambiarVista("actuales");
            void cargar();
          }}
          onMessage={setMensaje}
        />
      ) : (
        <>
          <Filtros
            borrador={borrador}
            onChange={setBorrador}
            onApply={() => setFiltros({ ...borrador, vista, pagina: 1 })}
            onClear={() => {
              const limpios = { vista, pagina: 1 } as FiltrosSolicitudes;
              setBorrador(limpios);
              setFiltros(limpios);
            }}
          />
          <section className={styles.card}>
            <header className={styles.listHeader}>
              <div>
                <h2>
                  {vista === "actuales"
                    ? "Peticiones por gestionar"
                    : "Peticiones anteriores"}
                </h2>
                <p>{meta.total} solicitud(es) encontradas</p>
              </div>
            </header>
            <div className="table-wrap">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Docente</th>
                    <th>Proyecto</th>
                    <th>Asignatura y aulas</th>
                    <th>Software solicitado</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id}>
                      <td>
                        <time>
                          {new Date(solicitud.fechaPeticion).toLocaleDateString(
                            "es-CO",
                          )}
                        </time>
                      </td>
                      <td>
                        <strong>
                          {solicitud.docente?.nombre ??
                            solicitud.docenteNombreOriginal ??
                            "Sin docente"}
                        </strong>
                        <small>{solicitud.docenteCorreoOriginal}</small>
                      </td>
                      <td>
                        {solicitud.proyectoCurricular?.nombre ??
                          solicitud.proyectoCurricularOriginal ??
                          "Sin proyecto"}
                      </td>
                      <td>
                        {solicitud.items.map((item) => (
                          <span className={styles.stack} key={item.id}>
                            {item.asignatura?.nombre ??
                              item.asignaturaOriginal ??
                              "Sin asignatura"}
                            <small>
                              {item.aulas
                                .map(
                                  (aula) =>
                                    aula.aula?.codigo ?? aula.valorOriginal,
                                )
                                .join(", ")}
                            </small>
                          </span>
                        ))}
                      </td>
                      <td>
                        <div className={styles.tags}>
                          {solicitud.items
                            .flatMap((item) => item.softwareSolicitado)
                            .map((programa) => (
                              <span key={programa.id}>
                                {programa.software?.nombre ??
                                  programa.nombreNormalizado ??
                                  programa.nombreOriginal}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.status} ${solicitud.estado === "REQUIERE_AJUSTES" ? styles.warning : ""}`}
                        >
                          {etiquetasEstado[solicitud.estado]}
                        </span>
                        {solicitud.historicaAlImportar && (
                          <small>
                            {solicitud.motivoHistorialInicial ===
                            "FECHA_ANTERIOR_CORTE"
                              ? "Histórico por fecha"
                              : "Histórico por marca verde"}
                          </small>
                        )}
                        {solicitud.progresoTareas.total > 0 && (
                          <small>
                            {solicitud.progresoTareas.completadas}/
                            {solicitud.progresoTareas.total} tareas completadas
                          </small>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => void abrirDetalle(solicitud.id)}
                        >
                          Ver y corregir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!cargando && solicitudes.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        No hay solicitudes para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                  {cargando && (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        Cargando solicitudes…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className={styles.pagination}>
              <span>
                Página {meta.pagina} de {meta.totalPaginas || 1}
              </span>
              <div>
                <button
                  type="button"
                  disabled={meta.pagina <= 1}
                  onClick={() =>
                    setFiltros((actual) => ({
                      ...actual,
                      pagina: meta.pagina - 1,
                    }))
                  }
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={meta.pagina >= meta.totalPaginas}
                  onClick={() =>
                    setFiltros((actual) => ({
                      ...actual,
                      pagina: meta.pagina + 1,
                    }))
                  }
                >
                  Siguiente
                </button>
              </div>
            </footer>
          </section>
        </>
      )}
      {detalle && (
        <DetalleSolicitud
          solicitud={detalle}
          onClose={() => setDetalle(null)}
          onSaved={(actualizada) => {
            setDetalle(actualizada);
            void cargar();
            setMensaje({
              tipo: "ok",
              texto:
                "Las correcciones quedaron guardadas sin modificar los valores originales.",
            });
          }}
        />
      )}
    </>
  );
}

function Filtros({
  borrador,
  onChange,
  onApply,
  onClear,
}: {
  borrador: FiltrosSolicitudes;
  onChange: (value: FiltrosSolicitudes) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const campo = (nombre: keyof FiltrosSolicitudes, valor: string) =>
    onChange({ ...borrador, [nombre]: valor });
  return (
    <form
      className={styles.filters}
      onSubmit={(evento) => {
        evento.preventDefault();
        onApply();
      }}
    >
      <label className={styles.search}>
        <span>Buscar</span>
        <input
          value={borrador.q ?? ""}
          onChange={(e) => campo("q", e.target.value)}
          placeholder="Docente, correo o texto…"
        />
      </label>
      <label>
        <span>Desde</span>
        <input
          type="date"
          value={borrador.desde ?? ""}
          onChange={(e) => campo("desde", e.target.value)}
        />
      </label>
      <label>
        <span>Hasta</span>
        <input
          type="date"
          value={borrador.hasta ?? ""}
          onChange={(e) => campo("hasta", e.target.value)}
        />
      </label>
      <label>
        <span>Asignatura</span>
        <input
          value={borrador.asignatura ?? ""}
          onChange={(e) => campo("asignatura", e.target.value)}
        />
      </label>
      <label>
        <span>Proyecto curricular</span>
        <input
          value={borrador.proyectoCurricular ?? ""}
          onChange={(e) => campo("proyectoCurricular", e.target.value)}
        />
      </label>
      <label>
        <span>Aula</span>
        <input
          value={borrador.aula ?? ""}
          onChange={(e) => campo("aula", e.target.value)}
        />
      </label>
      <label>
        <span>Software</span>
        <input
          value={borrador.software ?? ""}
          onChange={(e) => campo("software", e.target.value)}
        />
      </label>
      <div className={styles.filterActions}>
        <button type="button" onClick={onClear}>
          Limpiar
        </button>
        <button type="submit" className="button-primary">
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}

function Importador({
  onImported,
  onMessage,
}: {
  onImported: () => void;
  onMessage: (value: { tipo: "ok" | "error"; texto: string }) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PrevisualizacionImportacion | null>(
    null,
  );
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<{
    importacionId: string;
    creadas: number;
    observadas: number;
  } | null>(null);
  const previsualizar = async () => {
    if (!archivo) return;
    setProcesando(true);
    try {
      setPreview(await previsualizarSolicitudes(archivo));
    } catch (error) {
      onMessage({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No fue posible revisar el archivo.",
      });
    } finally {
      setProcesando(false);
    }
  };
  const confirmar = async () => {
    if (!archivo) return;
    setProcesando(true);
    try {
      const resultado = await importarSolicitudes(archivo);
      onMessage({
        tipo: "ok",
        texto: `Se importaron ${resultado.resumen.solicitudesCreadas} solicitudes; ${resultado.resumen.filasObservadas} requieren revisión.`,
      });
      setResultado({
        importacionId: resultado.importacion.id,
        creadas: resultado.resumen.solicitudesCreadas,
        observadas: resultado.resumen.filasObservadas,
      });
      setPreview(null);
    } catch (error) {
      onMessage({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No fue posible importar el archivo.",
      });
    } finally {
      setProcesando(false);
    }
  };
  const descargarResultadoActual = async () => {
    if (!resultado) return;
    try {
      descargarBlob(
        await descargarResultadoImportacion(resultado.importacionId),
        `resultado-importacion-${resultado.importacionId}.csv`,
      );
    } catch (error) {
      onMessage({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No fue posible descargar el resultado.",
      });
    }
  };
  return (
    <section className={styles.importCard}>
      <div className={styles.dropzone}>
        <strong>Seleccione el Excel de respuestas</strong>
        <p>
          Primero se analiza y normaliza. Nada se guarda hasta que confirme la
          importación.
        </p>
        <label className={styles.filePicker}>
          <span>Seleccionar archivo</span>
          <input
            className={styles.fileInput}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setPreview(null);
              setResultado(null);
            }}
          />
        </label>
        <small className={styles.fileName}>
          {archivo?.name ?? "Ningún archivo seleccionado"}
        </small>
        <button
          type="button"
          className="button-primary"
          disabled={!archivo || procesando}
          onClick={() => void previsualizar()}
        >
          {procesando ? "Analizando…" : "Previsualizar"}
        </button>
      </div>
      {resultado && (
        <div className={styles.importResult}>
          <div>
            <strong>Importación completada</strong>
            <p>
              {resultado.creadas} solicitudes creadas · {resultado.observadas}{" "}
              observadas
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void descargarResultadoActual()}
            >
              Descargar resultado CSV
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={onImported}
            >
              Ir a peticiones actuales
            </button>
          </div>
        </div>
      )}
      {preview && (
        <div className={styles.preview}>
          <header>
            <div>
              <h2>Resultado de la previsualización</h2>
              <p>{preview.nombreArchivo}</p>
            </div>
            <button
              type="button"
              className="button-primary"
              disabled={Boolean(preview.importacionExistente) || procesando}
              onClick={() => void confirmar()}
            >
              Confirmar importación
            </button>
          </header>
          {preview.importacionExistente && (
            <p className={styles.duplicate}>
              Este archivo ya fue importado y no puede cargarse de nuevo.
            </p>
          )}
          <div className={styles.metrics}>
            <Metric
              label="Solicitudes"
              value={preview.resumen.totalSolicitudes}
            />
            <Metric label="Listas" value={preview.resumen.listasParaImportar} />
            <Metric label="Observadas" value={preview.resumen.observadas} />
            <Metric label="Ambiguas" value={preview.resumen.ambiguas} />
            <Metric
              label="Posibles duplicados"
              value={preview.resumen.posiblesDuplicados}
            />
          </div>
          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Docente</th>
                  <th>Proyecto</th>
                  <th>Software detectado</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {preview.solicitudes.map((fila) => (
                  <tr key={fila.filaOrigen}>
                    <td>{fila.filaOrigen}</td>
                    <td>{fila.docenteOriginal ?? "Sin docente"}</td>
                    <td>{fila.proyectoOriginal ?? "Sin proyecto"}</td>
                    <td>
                      {fila.items
                        .flatMap((item) => item.software)
                        .map(
                          (item) =>
                            item.nombreNormalizado ?? item.nombreOriginal,
                        )
                        .join(", ")}
                    </td>
                    <td>
                      {fila.alertas.length ? (
                        <details>
                          <summary>
                            {fila.alertas.length} observación(es)
                          </summary>
                          <ul>
                            {fila.alertas.map((alerta) => (
                              <li key={alerta}>{alerta}</li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span className={styles.ready}>Lista</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function DetalleSolicitud({
  solicitud,
  onClose,
  onSaved,
}: {
  solicitud: SolicitudInstalacion;
  onClose: () => void;
  onSaved: (value: SolicitudInstalacion) => void;
}) {
  const [catalogos, setCatalogos] = useState<CatalogosNormalizacion | null>(
    null,
  );
  const [docenteId, setDocenteId] = useState(solicitud.docenteId ?? "");
  const [periodoId, setPeriodoId] = useState(solicitud.periodoId ?? "");
  const [aulas, setAulas] = useState<Record<string, string>>(
    Object.fromEntries(
      solicitud.items.flatMap((item) =>
        item.aulas.map((aula) => [aula.id, aula.aulaId ?? ""]),
      ),
    ),
  );
  const [guardarAlias, setGuardarAlias] = useState<Record<string, boolean>>({});
  const [seleccionadas, setSeleccionadas] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        solicitud.items.flatMap((item) =>
          item.softwareSolicitado.flatMap((programa) =>
            item.aulas.map(
              (aula) =>
                [
                  `${programa.id}:${aula.id}`,
                  Boolean(aula.aulaId && aula.estado !== "AMBIGUO"),
                ] as const,
            ),
          ),
        ),
      ),
  );
  const [previewAprobacion, setPreviewAprobacion] =
    useState<PrevisualizacionAprobacion | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [mostrandoRechazo, setMostrandoRechazo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const permisos = obtenerSesion()?.usuario.permisos ?? [];
  const puedeAprobar = permisos.includes("SOLICITUDES_INSTALACION_APROBAR");
  const puedeRechazar = permisos.includes("SOLICITUDES_INSTALACION_RECHAZAR");
  const puedeActualizar = permisos.includes(
    "SOLICITUDES_INSTALACION_ACTUALIZAR",
  );
  useEffect(() => {
    void cargarCatalogosNormalizacion()
      .then(setCatalogos)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "No fue posible cargar los catálogos.",
        ),
      );
  }, []);
  const persistirCorrecciones = async () => {
    await actualizarSolicitud(solicitud.id, {
      docenteId: docenteId || null,
      periodoId: periodoId || null,
    });
    let actualizada = solicitud;
    for (const item of solicitud.items) {
      actualizada = await actualizarItemSolicitud(solicitud.id, item.id, {
        estadoRevision: "VALIDADO",
        aulas: item.aulas.map((aula) => ({
          id: aula.id,
          aulaId: aulas[aula.id] || null,
          estado: aulas[aula.id] ? "COINCIDENCIA" : "NUEVO",
          guardarAlias: Boolean(guardarAlias[aula.id]),
        })),
      });
    }
    onSaved(actualizada);
  };
  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      await persistirCorrecciones();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar las correcciones.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const crearSeleccion = (): SeleccionAprobacion => ({
    items: solicitud.items
      .map((item) => ({
        itemId: item.id,
        software: item.softwareSolicitado
          .map((programa) => ({
            softwareSolicitadoId: programa.id,
            aulaIds: item.aulas
              .filter((aula) => seleccionadas[`${programa.id}:${aula.id}`])
              .map((aula) => aula.id),
          }))
          .filter((programa) => programa.aulaIds.length > 0),
      }))
      .filter((item) => item.software.length > 0),
  });
  const revisarAprobacion = async () => {
    setGuardando(true);
    setError("");
    try {
      await persistirCorrecciones();
      setPreviewAprobacion(
        await previsualizarAprobacion(solicitud.id, crearSeleccion()),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible previsualizar las tareas.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const confirmarAprobacion = async () => {
    setGuardando(true);
    setError("");
    try {
      await aprobarSolicitud(solicitud.id, crearSeleccion());
      const actualizada = await obtenerSolicitud(solicitud.id);
      setPreviewAprobacion(null);
      onSaved(actualizada);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible aprobar la solicitud.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const rechazar = async () => {
    if (motivoRechazo.trim().length < 5) {
      setError(
        "Debe indicar un motivo de rechazo de al menos cinco caracteres.",
      );
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await rechazarSolicitud(solicitud.id, motivoRechazo);
      onSaved(await obtenerSolicitud(solicitud.id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible rechazar la solicitud.",
      );
    } finally {
      setGuardando(false);
    }
  };
  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de solicitud"
      >
        <header>
          <div>
            <span>
              Solicitud del{" "}
              {new Date(solicitud.fechaPeticion).toLocaleDateString("es-CO")}
            </span>
            <h2>Revisión y normalización</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {error && <p className={styles.duplicate}>{error}</p>}
        {!catalogos ? (
          <p>Cargando catálogos…</p>
        ) : (
          <div className={styles.detailBody}>
            <section className={styles.generalFields}>
              <Selector
                label="Docente"
                original={solicitud.docenteNombreOriginal}
                value={docenteId}
                onChange={setDocenteId}
                options={catalogos.docentes.map((item) => ({
                  id: item.id,
                  label: `${item.nombre}${item.correo ? ` · ${item.correo}` : ""}`,
                }))}
              />
              <ReadOnlyField
                label="Proyecto curricular"
                value={
                  solicitud.proyectoCurricularOriginal ?? "Sin información"
                }
              />
              <Selector
                label="Periodo académico"
                original={new Date(solicitud.fechaPeticion).toLocaleDateString(
                  "es-CO",
                )}
                value={periodoId}
                onChange={setPeriodoId}
                options={catalogos.periodos.map((item) => ({
                  id: item.id,
                  label: item.nombre,
                }))}
              />
            </section>
            {solicitud.alertas && solicitud.alertas.length > 0 && (
              <aside className={styles.alerts}>
                <strong>Observaciones detectadas</strong>
                <ul>
                  {solicitud.alertas.map((alerta) => (
                    <li key={alerta}>{alerta}</li>
                  ))}
                </ul>
              </aside>
            )}
            {solicitud.items.map((item) => (
              <article className={styles.itemCard} key={item.id}>
                <header>
                  <h3>Solicitud {item.posicion}</h3>
                  <span>{item.estadoRevision}</span>
                </header>
                <ReadOnlyField
                  label="Asignatura"
                  value={item.asignaturaOriginal ?? "Sin información"}
                />
                <div className={styles.normalizationGrid}>
                  <div>
                    <h4>Aulas</h4>
                    {item.aulas.map((aula) => (
                      <NormalizedSelector
                        key={aula.id}
                        original={aula.valorOriginal}
                        state={aula.estado}
                        value={aulas[aula.id] ?? ""}
                        onChange={(valor) =>
                          setAulas((actual) => ({
                            ...actual,
                            [aula.id]: valor,
                          }))
                        }
                        options={catalogos.aulas.map((actual) => ({
                          id: actual.id,
                          label: `${actual.codigo} · ${actual.ubicacion}`,
                        }))}
                        alias={Boolean(guardarAlias[aula.id])}
                        onAlias={(valor) =>
                          setGuardarAlias((actual) => ({
                            ...actual,
                            [aula.id]: valor,
                          }))
                        }
                      />
                    ))}
                  </div>
                  <div>
                    <h4>Software</h4>
                    <div className={styles.softwarePlainList}>
                      {item.softwareSolicitado.map((programa) => (
                        <div key={programa.id}>
                          <strong>{programa.nombreOriginal}</strong>
                          <span>Software solicitado</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {puedeAprobar &&
                  !["FINALIZADA", "RECHAZADA", "CANCELADA"].includes(
                    solicitud.estado,
                  ) && (
                    <div className={styles.approvalMatrix}>
                      <h4>Instalaciones que se aprobarán</h4>
                      {item.softwareSolicitado.map((programa) => (
                        <div key={programa.id}>
                          <strong>
                            {programa.software?.nombre ??
                              programa.nombreNormalizado ??
                              programa.nombreOriginal}
                          </strong>
                          <div>
                            {item.aulas.map((aula) => {
                              const llave = `${programa.id}:${aula.id}`;
                              const aulaSeleccionada = aulas[aula.id];
                              const valida = Boolean(aulaSeleccionada);
                              const codigoAula =
                                catalogos.aulas.find(
                                  (actual) => actual.id === aulaSeleccionada,
                                )?.codigo ??
                                aula.aula?.codigo ??
                                aula.valorOriginal;
                              return (
                                <label key={aula.id}>
                                  <input
                                    type="checkbox"
                                    disabled={!valida}
                                    checked={
                                      Boolean(seleccionadas[llave]) && valida
                                    }
                                    onChange={(e) =>
                                      setSeleccionadas((actual) => ({
                                        ...actual,
                                        [llave]: e.target.checked,
                                      }))
                                    }
                                  />{" "}
                                  Aula {codigoAula}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </article>
            ))}
            {solicitud.progresoTareas.total > 0 && (
              <section className={styles.taskProgress}>
                <header>
                  <div>
                    <h3>Progreso operativo</h3>
                    <p>
                      {solicitud.progresoTareas.completadas} de{" "}
                      {solicitud.progresoTareas.total} tareas completadas
                    </p>
                  </div>
                  <strong>{solicitud.progresoTareas.porcentaje}%</strong>
                </header>
                <div className={styles.progressBar}>
                  <i
                    style={{ width: `${solicitud.progresoTareas.porcentaje}%` }}
                  />
                </div>
                <div className={styles.taskList}>
                  {solicitud.items
                    .flatMap((item) =>
                      item.softwareSolicitado.flatMap((programa) =>
                        programa.tareasGeneradas.map((relacion) => ({
                          ...relacion,
                          programa,
                          aula: item.aulas.find(
                            (aula) => aula.id === relacion.itemAulaId,
                          ),
                        })),
                      ),
                    )
                    .map((relacion) => (
                      <article key={relacion.tareaId}>
                        <div>
                          <strong>{relacion.tarea.titulo}</strong>
                          <small>
                            Aula{" "}
                            {relacion.aula?.aula?.codigo ??
                              relacion.aula?.valorOriginal ??
                              "sin aula"}{" "}
                            · {relacion.tarea.estado}
                          </small>
                        </div>
                        {relacion.inventarioConfirmadoEn ? (
                          <span className={styles.ready}>
                            Inventario confirmado
                          </span>
                        ) : relacion.tarea.estado === "COMPLETADA" ? (
                          <span className={styles.ready}>
                            Instalación completada
                          </span>
                        ) : (
                          <span>Pendiente</span>
                        )}
                      </article>
                    ))}
                </div>
              </section>
            )}
            {(puedeAprobar || puedeRechazar) &&
              !["FINALIZADA", "RECHAZADA", "CANCELADA"].includes(
                solicitud.estado,
              ) && (
                <section className={styles.decisions}>
                  <div className={styles.decisionHeader}>
                    <h3>Decisión sobre la solicitud</h3>
                    <div className={styles.decisionActions}>
                      {puedeAprobar && (
                        <button
                          type="button"
                          className={styles.decisionButton}
                          disabled={guardando}
                          onClick={() => void revisarAprobacion()}
                        >
                          Previsualizar tareas y aprobar
                        </button>
                      )}
                      {puedeRechazar && (
                        <button
                          type="button"
                          className={styles.decisionButton}
                          disabled={guardando || mostrandoRechazo}
                          onClick={() => {
                            setMostrandoRechazo(true);
                            setError("");
                          }}
                        >
                          Rechazar solicitud
                        </button>
                      )}
                    </div>
                  </div>
                  {mostrandoRechazo && (
                    <div className={styles.rejectionPanel}>
                      <label>
                        <span>Motivo del rechazo</span>
                        <textarea
                          autoFocus
                          value={motivoRechazo}
                          onChange={(e) => setMotivoRechazo(e.target.value)}
                          placeholder="Explique por qué se rechaza esta solicitud"
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          className={styles.cancelDecisionButton}
                          disabled={guardando}
                          onClick={() => {
                            setMostrandoRechazo(false);
                            setMotivoRechazo("");
                            setError("");
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={styles.decisionButton}
                          disabled={
                            guardando || motivoRechazo.trim().length < 5
                          }
                          onClick={() => void rechazar()}
                        >
                          {guardando ? "Rechazando…" : "Confirmar rechazo"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            {previewAprobacion && (
              <section className={styles.approvalPreview}>
                <header>
                  <div>
                    <h3>
                      Aprobación{" "}
                      {previewAprobacion.aprobacion.toLocaleLowerCase("es")}
                    </h3>
                    <p>
                      Se crearán{" "}
                      {
                        previewAprobacion.tareas.filter(
                          (tarea) => !tarea.yaExiste,
                        ).length
                      }{" "}
                      tarea(s);{" "}
                      {
                        previewAprobacion.tareas.filter(
                          (tarea) => tarea.yaExiste,
                        ).length
                      }{" "}
                      ya existen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewAprobacion(null)}
                  >
                    ×
                  </button>
                </header>
                {previewAprobacion.tareas.map((tarea) => (
                  <article
                    key={`${tarea.softwareSolicitadoId}:${tarea.itemAulaId}`}
                  >
                    <div>
                      <strong>{tarea.titulo}</strong>
                      <small>
                        {tarea.asignatura} · Aula {tarea.aula}
                      </small>
                    </div>
                    <span>{tarea.yaExiste ? "Ya creada" : "Nueva tarea"}</span>
                  </article>
                ))}
                <button
                  type="button"
                  className="button-primary"
                  disabled={guardando}
                  onClick={() => void confirmarAprobacion()}
                >
                  Confirmar aprobación
                </button>
              </section>
            )}
          </div>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
          {puedeActualizar && (
            <button
              type="button"
              className="button-primary"
              disabled={!catalogos || guardando}
              onClick={() => void guardar()}
            >
              {guardando ? "Guardando…" : "Guardar correcciones"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function Selector({
  label,
  original,
  value,
  onChange,
  options,
}: {
  label: string;
  original: string | null;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <label className={styles.selector}>
      <span>{label}</span>
      <small>Original: {original || "Sin valor"}</small>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin relacionar</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.readOnlyField}>
      <span>{label}</span>
      <small>Guardado como texto</small>
      <strong>{value}</strong>
    </div>
  );
}

function NormalizedSelector({
  original,
  state,
  value,
  onChange,
  options,
  alias,
  onAlias,
}: {
  original: string;
  state: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  alias: boolean;
  onAlias: (value: boolean) => void;
}) {
  return (
    <div className={styles.normalized}>
      <div>
        <strong>{original}</strong>
        <span>{state}</span>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin relacionar</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={alias}
          disabled={!value}
          onChange={(e) => onAlias(e.target.checked)}
        />{" "}
        Recordar esta equivalencia como alias
      </label>
    </div>
  );
}
