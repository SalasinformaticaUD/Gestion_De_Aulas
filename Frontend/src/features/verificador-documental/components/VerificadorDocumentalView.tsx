"use client";

import { useEffect, useRef, useState } from "react";
import { eventoSesion, obtenerSesion } from "@/features/auth/lib/sesion";
import {
  cargarCatalogos,
  cargarYProcesarArchivos,
  crearVerificacion,
  listarVerificaciones,
  obtenerVerificacion,
  eliminarVerificacion,
} from "../api/verificadorDocumentalApi";
import type {
  CatalogosDocumentales,
  DetalleVerificacion,
  Verificacion,
  EstadoVerificacion,
  NuevaVerificacion,
  PaginaVerificaciones,
  TipoIdentificacion,
  ArchivoSeleccionado,
  EstadoCarga,
} from "../types";
import { CargaDocumental } from "./CargaDocumental";
import { ResultadoDocumental } from "./ResultadoDocumental";
import {
  estadoResultado,
  estadoHistorial,
  etiquetasResultado,
} from "../utils/resultadoDocumental";
import { limitesIniciales, validarArchivo } from "../utils/validarArchivo";
import styles from "./VerificadorDocumentalView.module.css";

const tipos: { value: TipoIdentificacion; label: string }[] = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "PEP", label: "Permiso especial de permanencia" },
  { value: "PPT", label: "Permiso por protección temporal" },
  { value: "OTRO", label: "Otro" },
];
const estados: Record<EstadoVerificacion, string> = {
  BORRADOR: "Borrador · sin verificar",
  PENDIENTE: "Pendiente",
  PROCESANDO: "Procesando",
  SATISFACTORIA: "Documentación verificada correctamente",
  CON_INCONSISTENCIAS: "Documentación con inconsistencias",
  INCOMPLETA: "Verificación incompleta",
  FALLIDA: "Verificación incompleta",
};
const inicial: NuevaVerificacion = {
  tipoIdentificacion: "CC",
  numeroIdentificacion: "",
  nombreCompleto: "",
  fechaSolicitud: "",
  modalidadCarga: "PDF_UNIFICADO",
};
const errorTexto = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No fue posible completar la operación.";

export function VerificadorDocumentalView() {
  const [acceso, setAcceso] = useState({
    listo: false,
    leer: false,
    crear: false,
    eliminar: false,
  });
  useEffect(() => {
    const actualizar = () => {
      const usuario = obtenerSesion()?.usuario;
      const modulo =
        usuario?.modulos.includes("VERIFICADOR_DOCUMENTAL") ?? false;
      const leer =
        modulo &&
        (usuario?.permisos.includes("VERIFICADOR_DOCUMENTAL_LEER") ?? false);
      setAcceso({
        listo: true,
        leer,
        eliminar:
          leer &&
          (usuario?.permisos.includes("VERIFICADOR_DOCUMENTAL_ELIMINAR") ??
            false),
        crear:
          leer &&
          (usuario?.permisos.includes("VERIFICADOR_DOCUMENTAL_CREAR") ?? false),
      });
    };
    actualizar();
    window.addEventListener(eventoSesion, actualizar);
    return () => window.removeEventListener(eventoSesion, actualizar);
  }, []);
  if (!acceso.listo)
    return <section className={styles.view}>Verificando permisos...</section>;
  if (!acceso.leer)
    return (
      <section className={styles.view}>
        <h1>Verificador documental de contratistas</h1>
        <p role="alert">
          No tiene permiso para consultar este módulo. Solicite la asignación a
          su rol desde Administración.
        </p>
      </section>
    );
  return (
    <ContenidoVerificador
      puedeCrear={acceso.crear}
      puedeEliminar={acceso.eliminar}
    />
  );
}

function ContenidoVerificador({
  puedeCrear,
  puedeEliminar,
}: {
  puedeCrear: boolean;
  puedeEliminar: boolean;
}) {
  const [vista, setVista] = useState<"historial" | "nueva">("historial");
  const [datos, setDatos] = useState<NuevaVerificacion>(inicial);
  const [catalogos, setCatalogos] = useState<CatalogosDocumentales | null>(
    null,
  );
  const [historial, setHistorial] = useState<PaginaVerificaciones | null>(null);
  const [detalle, setDetalle] = useState<DetalleVerificacion | null>(null);
  const [confirmarEliminacion, setConfirmarEliminacion] =
    useState<Verificacion | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const eliminandoRef = useRef(false);
  const cancelarEliminacionRef = useRef<HTMLButtonElement>(null);
  const focoTrasEliminarRef = useRef<string | null>(null);
  useEffect(() => {
    if (confirmarEliminacion && !eliminando)
      cancelarEliminacionRef.current?.focus();
    else if (!confirmarEliminacion && focoTrasEliminarRef.current) {
      document.getElementById(focoTrasEliminarRef.current)?.focus();
      focoTrasEliminarRef.current = null;
    }
  }, [confirmarEliminacion, eliminando]);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [revision, setRevision] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [archivos, setArchivos] = useState<ArchivoSeleccionado[]>([]);
  const [errorLote, setErrorLote] = useState("");
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("INACTIVO");
  const [porcentaje, setPorcentaje] = useState(0);
  const [borradorId, setBorradorId] = useState<string | null>(null);
  const validandoRef = useRef(false);
  const enviandoRef = useRef(false);
  const limites = catalogos?.limitesCarga ?? limitesIniciales;
  const validando = archivos.some((item) => item.estado === "VALIDANDO");
  const puedeProcesar =
    archivos.length > 0 && archivos.every((item) => item.estado === "LISTO");

  async function agregarArchivos(nuevos: File[]) {
    if (!nuevos.length || enviandoRef.current || validandoRef.current) return;
    setErrorLote("");
    setError("");
    if (
      datos.modalidadCarga === "PDF_UNIFICADO" &&
      archivos.length + nuevos.length > 1
    ) {
      setErrorLote(
        "Seleccione un único PDF unificado. Elimine el archivo actual antes de reemplazarlo.",
      );
      return;
    }
    if (archivos.length + nuevos.length > limites.maxArchivos) {
      setErrorLote(`Puede seleccionar hasta ${limites.maxArchivos} PDF.`);
      return;
    }
    if (
      [...archivos.map((item) => item.archivo), ...nuevos].reduce(
        (sum, file) => sum + file.size,
        0,
      ) > limites.maxTotalBytes
    ) {
      setErrorLote("El envío supera el límite total de 60 MB.");
      return;
    }
    validandoRef.current = true;
    const candidatos: ArchivoSeleccionado[] = nuevos.map((archivo) => ({
      id: crypto.randomUUID(),
      archivo,
      estado: "VALIDANDO",
    }));
    setArchivos((previos) => [...previos, ...candidatos]);
    try {
      for (const candidato of candidatos) {
        try {
          const sha256 = await validarArchivo(candidato.archivo, limites);
          setArchivos((previos) => {
            const duplicado = previos.some(
              (item) => item.id !== candidato.id && item.sha256 === sha256,
            );
            return previos.map((item) =>
              item.id !== candidato.id
                ? item
                : {
                    ...item,
                    sha256,
                    estado: duplicado ? "ERROR" : "LISTO",
                    error: duplicado
                      ? "Este PDF ya está seleccionado. Elimine la copia duplicada."
                      : undefined,
                  },
            );
          });
        } catch (e) {
          setArchivos((previos) =>
            previos.map((item) =>
              item.id !== candidato.id
                ? item
                : { ...item, estado: "ERROR", error: errorTexto(e) },
            ),
          );
        }
      }
    } finally {
      validandoRef.current = false;
    }
  }

  useEffect(() => {
    let vigente = true;
    cargarCatalogos()
      .then((valor) => {
        if (vigente) setCatalogos(valor);
      })
      .catch((e: unknown) => {
        if (vigente) setError(errorTexto(e));
      });
    return () => {
      vigente = false;
    };
  }, []);
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    listarVerificaciones(pagina, q)
      .then((valor) => {
        if (vigente) setHistorial(valor);
      })
      .catch((e: unknown) => {
        if (vigente) {
          setHistorial(null);
          setError(errorTexto(e));
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [pagina, q, revision]);

  async function guardar(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviandoRef.current || validandoRef.current) return;
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const procesar = submitter?.value === "procesar";
    if (procesar && !puedeProcesar) {
      setError(
        "Seleccione archivos PDF válidos antes de iniciar la verificación.",
      );
      return;
    }
    enviandoRef.current = true;
    setGuardando(true);
    setError("");
    setMensaje("");
    setEstadoCarga("CREANDO");
    try {
      let id = borradorId;
      if (!id) {
        const registro = await crearVerificacion({
          ...datos,
          nombreCompleto: datos.nombreCompleto.trim().replace(/\s+/g, " "),
          numeroIdentificacion: datos.numeroIdentificacion.trim(),
        });
        id = registro.id;
        setBorradorId(id);
      }
      if (procesar) {
        setEstadoCarga("SUBIENDO");
        setPorcentaje(0);
        const resultado = await cargarYProcesarArchivos(
          id,
          archivos.map((item) => item.archivo),
          setPorcentaje,
          () => setEstadoCarga("PROCESANDO"),
        );
        setDetalle(resultado);
        setEstadoCarga("COMPLETADO");
        setMensaje(
          "Análisis documental finalizado. Consulte las coincidencias, los datos originales y las observaciones que requieren revisión.",
        );
      } else {
        setDetalle(null);
        setEstadoCarga("INACTIVO");
        setMensaje(
          "Borrador registrado. Puede retomarlo desde su detalle para adjuntar los PDF.",
        );
      }
      setDatos(inicial);
      setArchivos([]);
      setBorradorId(null);
      setErrorLote("");
      setVista("historial");
      setPagina(1);
      setQ("");
      setBusqueda("");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(errorTexto(e));
      setEstadoCarga("ERROR");
      setRevision((v) => v + 1);
    } finally {
      setGuardando(false);
      enviandoRef.current = false;
    }
  }
  function retomarBorrador(registro: DetalleVerificacion) {
    setDatos({
      tipoIdentificacion: registro.tipoIdentificacion,
      numeroIdentificacion: registro.numeroIdentificacion,
      nombreCompleto: registro.nombreCompleto,
      fechaSolicitud: registro.fechaSolicitud.slice(0, 10),
      modalidadCarga: registro.modalidadCarga,
    });
    setBorradorId(registro.id);
    setArchivos([]);
    setErrorLote("");
    setError("");
    setMensaje("");
    setEstadoCarga("INACTIVO");
    setVista("nueva");
  }
  async function borrarRegistro(registro: Verificacion) {
    if (!puedeEliminar || eliminandoRef.current) return;
    eliminandoRef.current = true;
    setEliminando(registro.id);
    setError("");
    setMensaje("");
    try {
      await eliminarVerificacion(registro.id);
      focoTrasEliminarRef.current = "historial-verificador-titulo";
      setConfirmarEliminacion(null);
      setDetalle((actual) => (actual?.id === registro.id ? null : actual));
      if (borradorId === registro.id) {
        setBorradorId(null);
        setDatos(inicial);
        setArchivos([]);
        setEstadoCarga("INACTIVO");
      }
      setMensaje("Verificación eliminada del historial.");
      if (historial?.data.length === 1 && pagina > 1)
        setPagina((v) => Math.max(1, v - 1));
      else setRevision((v) => v + 1);
    } catch (e) {
      setError(errorTexto(e));
    } finally {
      eliminandoRef.current = false;
      setEliminando(null);
    }
  }

  async function abrirDetalle(id: string) {
    setCargandoDetalle(true);
    setError("");
    setDetalle(null);
    try {
      setDetalle(await obtenerVerificacion(id));
    } catch (e) {
      setError(errorTexto(e));
    } finally {
      setCargandoDetalle(false);
    }
  }

  return (
    <section className={styles.view}>
      <header className={styles.header}>
        <h1>Verificador documental de contratistas</h1>
        <p className={styles.muted}>
          Registre los datos de referencia del contratista y consulte sus
          verificaciones.
        </p>
      </header>
      <p className={styles.notice}>
        Cargue un PDF unificado o varios PDF individuales. Se identificarán los
        documentos, se compararán los datos personales y se aplicarán las reglas
        particulares de cada formato, conservando los valores originales.
      </p>
      <p className={styles.muted}>
        Los PDF se descartan al finalizar el análisis. El historial conserva
        solo los resultados y los datos necesarios para explicar los hallazgos.
        Para repetir la validación, cree una nueva verificación y adjunte todos
        los documentos nuevamente.
      </p>
      <div className={styles.tabs} aria-label="Vistas del verificador">
        <button
          type="button"
          disabled={guardando || validando || !!eliminando}
          aria-pressed={vista === "historial"}
          onClick={() => setVista("historial")}
        >
          Historial
        </button>
        {puedeCrear && (
          <button
            type="button"
            disabled={guardando || validando || !!eliminando}
            aria-pressed={vista === "nueva"}
            onClick={() => setVista("nueva")}
          >
            Nueva verificación
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {mensaje && <p role="status">{mensaje}</p>}
      {vista === "nueva" && puedeCrear && (
        <section className={styles.card}>
          <h2>Datos de referencia</h2>
          {borradorId && (
            <p className={styles.muted}>
              Borrador guardado. Sus datos de referencia están fijados para este
              envío.
            </p>
          )}
          <form className={styles.form} onSubmit={guardar}>
            <label>
              Tipo de identificación
              <select
                disabled={guardando || !!borradorId}
                value={datos.tipoIdentificacion}
                onChange={(e) =>
                  setDatos({
                    ...datos,
                    tipoIdentificacion: e.target.value as TipoIdentificacion,
                  })
                }
              >
                {tipos.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Número de identificación
              <input
                required
                maxLength={40}
                pattern="[A-Za-z0-9]+"
                title="Use letras y números, sin espacios ni puntos."
                disabled={guardando || !!borradorId}
                value={datos.numeroIdentificacion}
                onChange={(e) =>
                  setDatos({ ...datos, numeroIdentificacion: e.target.value })
                }
              />
            </label>
            <label className={styles.wide}>
              Nombre completo
              <input
                required
                minLength={2}
                maxLength={200}
                autoComplete="off"
                disabled={guardando || !!borradorId}
                value={datos.nombreCompleto}
                onChange={(e) =>
                  setDatos({ ...datos, nombreCompleto: e.target.value })
                }
              />
            </label>
            <label>
              Fecha de solicitud de contratación
              <input
                type="date"
                required
                disabled={guardando || !!borradorId}
                value={datos.fechaSolicitud}
                onChange={(e) =>
                  setDatos({ ...datos, fechaSolicitud: e.target.value })
                }
              />
            </label>
            <label>
              Modalidad de carga
              <select
                disabled={guardando || !!borradorId || archivos.length > 0}
                value={datos.modalidadCarga}
                onChange={(e) =>
                  setDatos({
                    ...datos,
                    modalidadCarga: e.target
                      .value as NuevaVerificacion["modalidadCarga"],
                  })
                }
              >
                <option value="PDF_UNIFICADO">Un PDF unificado</option>
                <option value="PDF_SEPARADOS">Varios PDF separados</option>
              </select>
            </label>
            <p className={`${styles.wide} ${styles.muted}`}>
              Se validarán todos los campos disponibles. El contratista no
              necesita estar registrado previamente.
            </p>
            <CargaDocumental
              archivos={archivos}
              modalidad={datos.modalidadCarga}
              limites={limites}
              bloqueado={guardando || validando}
              estado={estadoCarga}
              porcentaje={porcentaje}
              errorLote={errorLote}
              onAgregar={(files) => void agregarArchivos(files)}
              onEliminar={(id) => {
                setArchivos((previos) => {
                  const hashes = new Set<string>();
                  return previos
                    .filter((item) => item.id !== id)
                    .map((item) => {
                      if (!item.sha256) return item;
                      const duplicado = hashes.has(item.sha256);
                      hashes.add(item.sha256);
                      return {
                        ...item,
                        estado: duplicado ? "ERROR" : "LISTO",
                        error: duplicado
                          ? "Este PDF ya está seleccionado. Elimine la copia duplicada."
                          : undefined,
                      };
                    });
                });
                setErrorLote("");
              }}
            />
            <div className={`${styles.wide} ${styles.toolbar}`}>
              <button
                type="submit"
                value="procesar"
                className="button-primary"
                disabled={guardando || validando || !puedeProcesar}
              >
                Iniciar verificación
              </button>
              {!borradorId && (
                <button
                  type="submit"
                  value="borrador"
                  disabled={guardando || validando || archivos.length > 0}
                >
                  Guardar borrador sin archivos
                </button>
              )}
              {borradorId && !guardando && (
                <button
                  type="button"
                  onClick={() => {
                    setDatos(inicial);
                    setBorradorId(null);
                    setArchivos([]);
                    setErrorLote("");
                    setEstadoCarga("INACTIVO");
                    setError("");
                  }}
                >
                  Preparar otra verificación
                </button>
              )}
            </div>
          </form>
          {catalogos && (
            <details>
              <summary>Documentos requeridos</summary>
              <p className={styles.muted}>
                Puede adjuntarlos en cualquier orden.
              </p>
              <ul>
                {catalogos.documentosRequeridos.map((doc) => (
                  <li key={doc.tipo}>{doc.nombre}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {vista === "historial" && (
        <section className={styles.card} aria-busy={cargando}>
          <h2 id="historial-verificador-titulo" tabIndex={-1}>
            Historial de verificaciones
          </h2>
          <form
            className={styles.toolbar}
            onSubmit={(e) => {
              e.preventDefault();
              setPagina(1);
              setQ(busqueda.trim());
              setDetalle(null);
              setError("");
              setRevision((v) => v + 1);
            }}
          >
            <input
              type="search"
              maxLength={200}
              disabled={!!eliminando}
              aria-label="Buscar por nombre o identificación"
              placeholder="Nombre o identificación"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="submit" disabled={!!eliminando}>
              Buscar
            </button>
            <button
              type="button"
              disabled={cargando || !!eliminando}
              onClick={() => {
                setError("");
                setRevision((v) => v + 1);
              }}
            >
              Actualizar
            </button>
          </form>
          {cargando ? (
            <p role="status">Cargando historial...</p>
          ) : (
            historial && (
              <>
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <caption>{historial.meta.total} registro(s)</caption>
                    <thead>
                      <tr>
                        <th scope="col">Contratista</th>
                        <th scope="col">Identificación</th>
                        <th scope="col">Solicitud</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Registrado por</th>
                        <th scope="col">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.data.map((item) => (
                        <tr key={item.id}>
                          <td>{item.nombreCompleto}</td>
                          <td>
                            {item.tipoIdentificacion}{" "}
                            {item.numeroIdentificacion}
                          </td>
                          <td>{item.fechaSolicitud.slice(0, 10)}</td>
                          <td>{estados[estadoHistorial(item)]}</td>
                          <td>{item.creadoPor.nombreCompleto}</td>
                          <td>
                            <button
                              type="button"
                              disabled={cargandoDetalle || !!eliminando}
                              onClick={() => void abrirDetalle(item.id)}
                            >
                              Ver detalle
                              <span className="sr-only">
                                {" "}
                                de {item.nombreCompleto}
                              </span>
                            </button>
                            {puedeEliminar &&
                              (confirmarEliminacion?.id === item.id ? (
                                <div
                                  className={styles.deleteConfirmation}
                                  role="group"
                                  aria-label={`Confirmar eliminación de ${item.nombreCompleto}`}
                                >
                                  <p>
                                    ¿Eliminar esta verificación y sus
                                    resultados? Esta acción no se puede
                                    deshacer.
                                  </p>
                                  <div className={styles.toolbar}>
                                    <button
                                      ref={cancelarEliminacionRef}
                                      type="button"
                                      disabled={!!eliminando}
                                      onClick={() => {
                                        focoTrasEliminarRef.current = `eliminar-${item.id}`;
                                        setConfirmarEliminacion(null);
                                      }}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.deleteButton}
                                      disabled={!!eliminando}
                                      onClick={() => void borrarRegistro(item)}
                                    >
                                      {eliminando === item.id
                                        ? "Eliminando..."
                                        : "Eliminar definitivamente"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  id={`eliminar-${item.id}`}
                                  type="button"
                                  className={styles.deleteButton}
                                  disabled={
                                    cargandoDetalle ||
                                    !!eliminando ||
                                    item.estado === "PROCESANDO"
                                  }
                                  onClick={() => setConfirmarEliminacion(item)}
                                >
                                  Eliminar
                                  <span className="sr-only">
                                    {" "}
                                    verificación de {item.nombreCompleto}
                                  </span>
                                </button>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!historial.data.length && (
                  <p>No hay verificaciones registradas para esta búsqueda.</p>
                )}
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    disabled={pagina <= 1 || !!eliminando}
                    onClick={() => {
                      setDetalle(null);
                      setPagina((v) => v - 1);
                    }}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {historial.meta.pagina} de{" "}
                    {historial.meta.totalPaginas}
                  </span>
                  <button
                    type="button"
                    disabled={
                      pagina >= historial.meta.totalPaginas || !!eliminando
                    }
                    onClick={() => {
                      setDetalle(null);
                      setPagina((v) => v + 1);
                    }}
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )
          )}
        </section>
      )}
      {vista === "historial" && cargandoDetalle && (
        <p role="status">Cargando detalle...</p>
      )}
      {vista === "historial" && detalle && (
        <section className={styles.card} aria-label="Detalle de verificación">
          <div className={styles.toolbar}>
            <h2>Detalle de verificación</h2>
            <button type="button" onClick={() => setDetalle(null)}>
              Cerrar detalle
            </button>
          </div>
          <dl className={styles.detail}>
            <dt>Contratista</dt>
            <dd>{detalle.nombreCompleto}</dd>
            <dt>Identificación</dt>
            <dd>
              {detalle.tipoIdentificacion} {detalle.numeroIdentificacion}
            </dd>
            <dt>Estado</dt>
            <dd>
              {["BORRADOR", "PENDIENTE", "PROCESANDO"].includes(detalle.estado)
                ? estados[detalle.estado]
                : etiquetasResultado[estadoResultado(detalle)]}
            </dd>
            <dt>Fecha de solicitud</dt>
            <dd>{detalle.fechaSolicitud.slice(0, 10)}</dd>
            <dt>Modalidad</dt>
            <dd>
              {detalle.modalidadCarga === "PDF_UNIFICADO"
                ? "PDF unificado"
                : "PDF separados"}
            </dd>
            <dt>Registrado por</dt>
            <dd>{detalle.creadoPor.nombreCompleto}</dd>
            <dt>Fecha de registro</dt>
            <dd>
              {new Date(detalle.creadoEn).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}
            </dd>
            <dt>Archivos</dt>
            <dd>{detalle.archivos.length}</dd>
          </dl>
          <ResultadoDocumental detalle={detalle} />
          {detalle.estado === "BORRADOR" && puedeCrear && (
            <button type="button" onClick={() => retomarBorrador(detalle)}>
              Adjuntar documentos a este borrador
            </button>
          )}
        </section>
      )}
    </section>
  );
}
