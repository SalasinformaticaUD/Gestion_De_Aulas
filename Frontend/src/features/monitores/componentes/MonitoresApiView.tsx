"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { adaptarMonitor } from "@/features/monitores/api/adaptadoresMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import type {
  DashboardApi,
  MonitorApi,
} from "@/features/monitores/api/contratosMonitores";
import estilos from "./SistemaVisualMonitores.module.css";
import { AvisoTemporal } from "./AvisoTemporal";
import { SelectorDependenciaAdmin } from "./FiltroDependenciaAdmin";
import { Paginacion } from "./Paginacion";
import { descargarPlantillaCarga } from "@/features/monitores/lib/plantillasCarga";

type FormMonitor = {
  full_name: string;
  codigo_estudiante: string;
  email: string;
  department: string;
  numero_documento: string;
  proyecto_curricular: string;
  telefono: string;
  confirm_repeating_monitor: boolean;
};
const vacio: FormMonitor = {
  full_name: "",
  codigo_estudiante: "",
  email: "",
  department: "informatics_labs",
  numero_documento: "",
  proyecto_curricular: "",
  telefono: "",
  confirm_repeating_monitor: false,
};
const soloNumeros = (valor: string) => valor.replace(/\D/g, "");
const nombresDependencia: Record<string, string> = { informatics_labs: "Monitores Aulas de Software", electrical: "Monitores Laboratorios", physics: "Monitores Física" };
const impactoSemestre = [
  ["monitors", "Monitores activos que pasan a histórico"],
  ["monitor_users", "Cuentas de monitor conservadas"],
  ["schedules", "Horarios archivados"],
  ["schedule_exceptions", "Excepciones conservadas"],
  ["attendance_import_jobs", "Cargas de asistencia conservadas"],
  ["attendance_raw_records", "Registros importados conservados"],
  ["work_sessions", "Registros procesados y horas extra conservados"],
  ["attendance_inconsistencies", "Inconsistencias conservadas"],
  ["annotations", "Anotaciones conservadas"],
  ["report_snapshots", "Reportes generados conservados"],
  ["memorandums", "Memorandos conservados"],
  ["notifications", "Notificaciones que se limpiarán"],
] as const;
const estadoCuenta = (monitor: MonitorApi) =>
  monitor.account_status ?? (monitor.is_active ? "ACTIVE" : "INACTIVE");
const etiquetaEstado = (monitor: MonitorApi) =>
  ({ ACTIVE: "Activo", PENDING: "Pendiente", INACTIVE: "Inactivo" })[
    estadoCuenta(monitor)
  ];

function FormularioMonitor({
  form,
  onChange,
  texto,
  guardando,
  dependenciaFija,
}: {
  form: FormMonitor;
  onChange: (form: FormMonitor) => void;
  texto: string;
  guardando: boolean;
  dependenciaFija?: string | null;
}) {
  return (
    <div className={estilos.formulario}>
      <label className={estilos.campo}>
        <span>Nombre completo</span>
        <input
          required
          value={form.full_name}
          onChange={(e) => onChange({ ...form, full_name: e.target.value })}
        />
      </label>
      <label className={estilos.campo}>
        <span>Código estudiantil</span>
        <input
          required
          inputMode="numeric"
          pattern="[0-9]+"
          value={form.codigo_estudiante}
          onChange={(e) =>
            onChange({
              ...form,
              codigo_estudiante: soloNumeros(e.target.value),
            })
          }
        />
      </label>
      <label className={estilos.campo}>
        <span>Correo institucional</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </label>
      <div className={estilos.formularioDoble}>
        <label className={estilos.campo}>
          <span>Número de documento</span>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]+"
            value={form.numero_documento}
            onChange={(e) =>
              onChange({
                ...form,
                numero_documento: soloNumeros(e.target.value),
              })
            }
          />
        </label>
        <label className={estilos.campo}>
          <span>Teléfono</span>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]+"
            value={form.telefono}
            onChange={(e) =>
              onChange({ ...form, telefono: soloNumeros(e.target.value) })
            }
          />
        </label>
      </div>
      <label className={estilos.campo}>
        <span>Proyecto curricular</span>
        <select
          required
          value={form.proyecto_curricular}
          onChange={(e) =>
            onChange({ ...form, proyecto_curricular: e.target.value })
          }
        >
          <option value="">Seleccione un proyecto curricular</option>
          <option value="ingenieria_electronica">Ingeniería electrónica</option>
          <option value="ingenieria_sistemas">Ingeniería de sistemas</option>
          <option value="ingenieria_electrica">Ingeniería eléctrica</option>
          <option value="ingenieria_industrial">Ingeniería industrial</option>
          <option value="ingenieria_catastral">Ingeniería catastral</option>
          <option value="licenciatura_fisica">Licenciatura en Física</option>
        </select>
      </label>
      {dependenciaFija ? (
        <label className={estilos.campo}>
          <span>Dependencia</span>
          <input value={nombresDependencia[dependenciaFija] ?? dependenciaFija} readOnly aria-readonly="true" />
        </label>
      ) : (
        <label className={estilos.campo}>
          <span>Dependencia</span>
          <select required value={form.department} onChange={(e) => onChange({ ...form, department: e.target.value })}>
            <option value="informatics_labs">Monitores Aulas de Software</option>
            <option value="electrical">Monitores Laboratorios</option>
            <option value="physics">Monitores Física</option>
          </select>
        </label>
      )}
      <button className="button-primary" disabled={guardando}>
        {guardando ? "Procesando…" : texto}
      </button>
    </div>
  );
}

export function MonitoresApiView() {
  const [rows, setRows] = useState<MonitorApi[]>([]);
  const [form, setForm] = useState(vacio);
  const [perfilMonitores, setPerfilMonitores] = useState<{ role: string; department?: string | null } | null>(null);
  const [buscar, setBuscar] = useState("");
  const [dependenciaFiltro, setDependenciaFiltro] = useState("");
  const [semestreFiltro, setSemestreFiltro] = useState("ACTUAL");
  const [resultadoReenvio, setResultadoReenvio] = useState<{ id: string; tipo: "exito" | "error"; mensaje: string } | null>(null);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const [selectorSemestreAbierto, setSelectorSemestreAbierto] = useState(false);
  const [semestres, setSemestres] = useState<Array<{ name: string; is_active: boolean }>>([]);
  const [crearModal, setCrearModal] = useState(false);
  const [cargaModal, setCargaModal] = useState(false);
  const [alertasPorMonitor, setAlertasPorMonitor] = useState<
    Record<
      string,
      Pick<
        DashboardApi["monitor_rows"][number],
        "late_count" | "memorandums_count"
      >
    >
  >({});
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultadoCarga, setResultadoCarga] = useState<{
    total_rows: number;
    created: number;
    skipped: unknown[];
    errors: unknown[];
  } | null>(null);
  const [edicion, setEdicion] = useState<MonitorApi | null>(null);
  const [formEdicion, setFormEdicion] = useState(vacio);
  const [eliminando, setEliminando] = useState<MonitorApi | null>(null);
  const [contrasena, setContrasena] = useState("");
  const [errorEliminacion, setErrorEliminacion] = useState("");
  const [semestreModal, setSemestreModal] = useState(false);
  const [nuevoSemestre, setNuevoSemestre] = useState("");
  const [fechaInicioSemestre, setFechaInicioSemestre] = useState("");
  const [fechaFinSemestre, setFechaFinSemestre] = useState("");
  const [contrasenaSemestre, setContrasenaSemestre] = useState("");
  const [confirmarFechasSemestre, setConfirmarFechasSemestre] = useState(false);
  const [errorSemestre, setErrorSemestre] = useState("");
  const [impacto, setImpacto] = useState<Record<string, number> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const fallo = (e: unknown, fallback: string) =>
    setError(e instanceof Error ? e.message : fallback);
  const cargar = useCallback(async (paginaSolicitada = pagina) => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await servicioMonitores.listarPaginaMonitores(paginaSolicitada, {
        buscar,
        dependencia: dependenciaFiltro,
        semestre: semestreFiltro,
      });
      setRows(respuesta.results);
      setTotalRegistros(respuesta.count);
      setAlertasPorMonitor({});
    } catch (e) {
      fallo(e, "No fue posible cargar los monitores.");
    } finally {
      setCargando(false);
    }
  }, [buscar, dependenciaFiltro, pagina, semestreFiltro]);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  useEffect(() => {
    void servicioMonitores.listarSemestresMonitores().then(setSemestres).catch(() => setSemestres([]));
  }, []);
  useEffect(() => {
    void servicioMonitores.obtenerPerfilMonitores().then((perfil) => {
      setPerfilMonitores(perfil);
      const dependencia = perfil.department;
      if (perfil.role === "leader" && dependencia) setForm((actual) => ({ ...actual, department: dependencia }));
    }).catch(() => setPerfilMonitores(null));
  }, []);
  const dependenciaLider = perfilMonitores?.role === "leader" ? perfilMonitores.department : null;
  const visibles = rows;
  const semestresHistoricos = useMemo(
    () => semestres.filter((semestre) => !semestre.is_active).map((semestre) => semestre.name),
    [semestres],
  );
  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const creado = await servicioMonitores.provisionarMonitor({ ...form, department: dependenciaLider ?? form.department });
      setRows((actual) => [creado, ...actual]);
      setForm({ ...vacio, department: dependenciaLider ?? vacio.department });
      setCrearModal(false);
      setAviso(
        creado.account_status === "PENDING"
          ? "Monitor creado. Se envió el correo de activación y permanecerá pendiente hasta que configure su contraseña."
          : creado.has_previous_monitoring
            ? "Monitor creado. Es un monitor que repite: su cuenta ya está activa, por lo que no se envió un nuevo correo de activación."
            : "Monitor creado con una cuenta activa.",
      );
    } catch (e) {
      fallo(e, "No fue posible crear el monitor.");
    } finally {
      setGuardando(false);
    }
  }
  async function alternar(item: MonitorApi) {
    try {
      const actualizado = await servicioMonitores.actualizarMonitor(item.id, {
        is_active: !item.is_active,
      });
      setRows((actual) =>
        actual.map((row) => (row.id === item.id ? actualizado : row)),
      );
    } catch (e) {
      fallo(e, "No fue posible actualizar el estado.");
    }
  }
  async function importar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!archivo) {
      setError("Selecciona un archivo Excel (.xlsx).");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const resultado = await servicioMonitores.importarMonitores(
        archivo,
        true,
      );
      setResultadoCarga(resultado);
      setAviso(`Carga finalizada: ${resultado.created} monitor(es) creado(s).`);
      await cargar();
    } catch (e) {
      fallo(e, "No fue posible procesar el archivo.");
    } finally {
      setGuardando(false);
    }
  }
  function abrirEdicion(item: MonitorApi) {
    setEdicion(item);
    setFormEdicion({
      full_name: item.full_name,
      codigo_estudiante: item.codigo_estudiante,
      email: item.user_email ?? "",
      department: item.department,
      numero_documento: item.numero_documento ?? "",
      proyecto_curricular: item.proyecto_curricular ?? "",
      telefono: item.telefono ?? "",
      confirm_repeating_monitor: false,
    });
  }
  async function guardarEdicion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!edicion) return;
    setGuardando(true);
    try {
      const actualizado = await servicioMonitores.editarCuentaMonitor(
        edicion.id,
        formEdicion,
      );
      setRows((actual) =>
        actual.map((row) => (row.id === actualizado.id ? actualizado : row)),
      );
      setEdicion(null);
      setAviso("Datos del monitor actualizados.");
    } catch (e) {
      fallo(e, "No fue posible editar el monitor.");
    } finally {
      setGuardando(false);
    }
  }
  async function reenviar(item: MonitorApi) {
    setReenviandoId(item.id);
    setResultadoReenvio(null);
    try {
      const respuesta = await servicioMonitores.reenviarActivacion(item.id);
      setResultadoReenvio({ id: item.id, tipo: "exito", mensaje: respuesta.detail || "Correo de activación enviado correctamente." });
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No fue posible reenviar el correo.";
      setResultadoReenvio({ id: item.id, tipo: "error", mensaje });
    } finally {
      setReenviandoId(null);
    }
  }
  async function confirmarEliminacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!eliminando) return;
    setErrorEliminacion("");
    setGuardando(true);
    try {
      const validacion =
        await servicioMonitores.verificarContrasenaActual(contrasena);
      if (!validacion.valido) {
        setErrorEliminacion("La contraseña no coincide. Verifícala e inténtalo nuevamente.");
        return;
      }
      await servicioMonitores.eliminarMonitor(eliminando.id);
      setRows((actual) => actual.filter((row) => row.id !== eliminando.id));
      setEliminando(null);
      setContrasena("");
      setAviso("Monitor eliminado correctamente.");
    } catch (e) {
      setErrorEliminacion(
        e instanceof Error ? e.message : "No fue posible validar la contraseña.",
      );
    } finally {
      setGuardando(false);
    }
  }
  async function abrirSemestre() {
    if (perfilMonitores?.role !== "admin") {
      setError("Solo el administrador puede iniciar un semestre nuevo.");
      return;
    }
    setError("");
    setErrorSemestre("");
    setConfirmarFechasSemestre(false);
    setContrasenaSemestre("");
    try {
      const datos = await servicioMonitores.previsualizarNuevoSemestre();
      setImpacto(datos.preview);
      setSemestreModal(true);
    } catch (e) {
      fallo(e, "No fue posible preparar el inicio de semestre.");
    }
  }
  async function iniciarSemestre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!fechaInicioSemestre || !fechaFinSemestre || fechaFinSemestre < fechaInicioSemestre) {
      setErrorSemestre("Ingresa fechas válidas para el nuevo semestre.");
      return;
    }
    setGuardando(true);
    setErrorSemestre("");
    try {
      const resultado =
        await servicioMonitores.iniciarNuevoSemestre(nuevoSemestre.trim(), fechaInicioSemestre, fechaFinSemestre, contrasenaSemestre);
        setSemestreModal(false);
        setConfirmarFechasSemestre(false);
        setNuevoSemestre("");
        setFechaInicioSemestre("");
        setFechaFinSemestre("");
        setContrasenaSemestre("");
      setAviso(
        `Se inició el semestre ${resultado.new_semester}. Los registros históricos se conservaron.`,
      );
      await cargar();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No fue posible iniciar el semestre.";
      setErrorSemestre(mensaje);
      if (mensaje.toLocaleLowerCase("es").includes("contraseña")) setConfirmarFechasSemestre(false);
    } finally {
      setGuardando(false);
    }
  }
  return (
    <div className={estilos.gestionCuentas}>
      <section className={`page-heading ${estilos.encabezado}`}>
        <div>
          <span className={estilos.etiqueta}>Gestión académica</span>
          <h1>Monitores</h1>
          <p>
            Administre cuentas, activaciones y la carga masiva del semestre.
          </p>
        </div>
        <div className={estilos.encabezadoAcciones}>
          <button
            type="button"
            className={estilos.botonSecundario}
            onClick={() => setCargaModal(true)}
          >
            Cargar Excel
          </button>
          {perfilMonitores?.role === "admin" && <button
            type="button"
            className={estilos.botonSecundario}
            onClick={() => void abrirSemestre()}
          >
            Iniciar semestre nuevo
          </button>}
          <button
            type="button"
            className="button-primary"
            onClick={() => setCrearModal(true)}
          >
            Nuevo monitor
          </button>
        </div>
      </section>
      <section className={estilos.metricas}>
        <article className={`${estilos.metrica} ${estilos.violeta}`}>
          <span>Total</span>
          <strong>{totalRegistros}</strong>
          <small>Monitores registrados</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.verde}`}>
          <span>Activos</span>
          <strong>{rows.filter((item) => estadoCuenta(item) === "ACTIVE").length}</strong>
          <small>En esta página</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.ambar}`}>
          <span>Pendientes</span>
          <strong>{rows.filter((item) => estadoCuenta(item) === "PENDING").length}</strong>
          <small>En esta página</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.azul}`}>
          <span>Inactivos</span>
          <strong>{rows.filter((item) => estadoCuenta(item) === "INACTIVE").length}</strong>
          <small>En esta página</small>
        </article>
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
      <section className={`${estilos.tarjeta} ${estilos.listadoCuentas}`}>
          <header>
            <div>
              <h2>Directorio de monitores</h2>
              <p>Gestione cada cuenta y su activación.</p>
            </div>
          </header>
          <div className={`${estilos.barraHerramientas} ${estilos.filtrosRegistros}`}><SelectorDependenciaAdmin visible={perfilMonitores?.role === "admin"} value={dependenciaFiltro} onChange={(valor) => { setDependenciaFiltro(valor); setPagina(1); }} />
            <label className={`${estilos.campoAncho} ${estilos.buscadorRegistros}`}>
              <span>Buscar</span>
              <input
                value={buscar}
                onChange={(e) => { setBuscar(e.target.value); setPagina(1); }}
                placeholder="Nombre, código o correo"
              />
            </label>
            <div className={`${estilos.campo} ${estilos.selectorSemestreMonitor}`}>
              <span id="etiqueta-semestre-monitor">Semestre</span>
              <button type="button" className={estilos.activadorSemestreMonitor} aria-labelledby="etiqueta-semestre-monitor" aria-expanded={selectorSemestreAbierto} aria-haspopup="listbox" onClick={() => setSelectorSemestreAbierto((abierto) => !abierto)}>
                {semestreFiltro === "ACTUAL" ? "Semestre actual" : semestreFiltro}<span aria-hidden="true">{selectorSemestreAbierto ? "▴" : "▾"}</span>
              </button>
              {selectorSemestreAbierto && <div className={estilos.opcionesSemestreMonitor} role="listbox" aria-label="Semestre">
                {[{ value: "ACTUAL", label: "Semestre actual" }, ...semestresHistoricos.map((semestre) => ({ value: semestre, label: semestre }))].map((opcion) => <button key={opcion.value} type="button" role="option" aria-selected={semestreFiltro === opcion.value} className={semestreFiltro === opcion.value ? estilos.opcionSemestreActiva : undefined} onClick={() => { setSemestreFiltro(opcion.value); setPagina(1); setSelectorSemestreAbierto(false); }}>{opcion.label}</button>)}
              </div>}
            </div>
          </div>
          <div className={estilos.tablaContenedor}>
            <table className={`${estilos.tabla} ${estilos.tablaCuentas}`}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Correo</th>
                  <th>Dependencia</th>
                  <th>Alertas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className={estilos.vacio}>
                      Cargando monitores…
                    </td>
                  </tr>
                ) : (
                  visibles.map((item) => {
                    const alertas = alertasPorMonitor[item.id] ?? {
                      late_count: 0,
                      memorandums_count: 0,
                    };
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.full_name}</strong>
                          <small>
                            {item.proyecto_curricular?.replaceAll("_", " ") ||
                              "Programa no registrado"}
                          </small>
                        </td>
                        <td>
                          {item.codigo_estudiante}
                          <small>
                            Doc. {item.numero_documento || "No registrado"}
                          </small>
                        </td>
                        <td className={estilos.correoCuenta}>
                          {item.user_email || "Sin correo vinculado"}
                          <small>{item.telefono || "Sin teléfono"}</small>
                        </td>
                        <td>{adaptarMonitor(item).dependencia}</td>
                        <td>
                          <span
                            className={`${estilos.insignia} ${alertas.late_count ? estilos.advertencia : estilos.exito}`}
                          >
                            {alertas.late_count} retardo
                            {alertas.late_count === 1 ? "" : "s"}
                          </span>
                          <small>
                            {alertas.memorandums_count} memorando
                            {alertas.memorandums_count === 1 ? "" : "s"}
                          </small>
                        </td>
                        <td>
                          <span className={`${estilos.insignia} ${estadoCuenta(item) === "ACTIVE" ? estilos.exito : estadoCuenta(item) === "PENDING" ? estilos.advertencia : estilos.neutro}`}>
                            {etiquetaEstado(item)}
                          </span>
                        </td>
                        <td>
                          <div className={estilos.accionesCuenta}>
                            <button
                              type="button"
                              onClick={() => abrirEdicion(item)}
                            >
                              Editar
                            </button>
                            {estadoCuenta(item) === "PENDING" && <><button type="button" disabled={reenviandoId === item.id} onClick={() => void reenviar(item)}>{reenviandoId === item.id ? "Reenviando…" : "Reenviar correo"}</button>{resultadoReenvio?.id === item.id && <p className={`${estilos.resultadoReenvioCorreo} ${resultadoReenvio.tipo === "error" ? estilos.resultadoReenvioError : estilos.resultadoReenvioExito}`} role={resultadoReenvio.tipo === "error" ? "alert" : "status"}>{resultadoReenvio.mensaje}</p>}</>}
                            <button
                              type="button"
                              onClick={() => void alternar(item)}
                            >
                              {item.is_active ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              type="button"
                              className={`${estilos.eliminar} ${estilos.eliminarMonitor}`}
                              aria-label={`Eliminar a ${item.full_name}`}
                              onClick={() => {
                                setContrasena("");
                                setErrorEliminacion("");
                                setEliminando(item);
                              }}
                            >
                              🗑 Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {!cargando && !visibles.length && (
                  <tr>
                    <td colSpan={7} className={estilos.vacio}>
                      No hay monitores registrados o coincidentes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} totalPaginas={Math.max(1, Math.ceil(totalRegistros / 20))} total={totalRegistros} anterior={() => setPagina((actual) => Math.max(1, actual - 1))} siguiente={() => setPagina((actual) => Math.min(Math.max(1, Math.ceil(totalRegistros / 20)), actual + 1))} />
      </section>
      {crearModal && (
        <div className={estilos.fondoModal}>
          <section className={`${estilos.modal} ${estilos.modalFormularioMonitor}`} role="dialog" aria-modal="true" aria-labelledby="titulo-crear-monitor">
            <header><div><h2 id="titulo-crear-monitor">Crear monitor</h2><p>Se valida código, correo y documento antes de registrar la cuenta.</p></div><button type="button" onClick={() => setCrearModal(false)}>×</button></header>
            <form onSubmit={crear}><FormularioMonitor form={form} onChange={setForm} texto="+ Crear y enviar activación" guardando={guardando} dependenciaFija={dependenciaLider} /></form>
          </section>
        </div>
      )}
      {cargaModal && (
        <div className={estilos.fondoModal}>
          <section className={`${estilos.modal} ${estilos.modalCargaMonitores}`} role="dialog" aria-modal="true" aria-labelledby="titulo-carga-monitores">
            <header><div><h2 id="titulo-carga-monitores">Carga masiva de monitores</h2><p>Seleccione un Excel con los encabezados indicados.</p></div><button type="button" onClick={() => setCargaModal(false)}>×</button></header>
            <form className={estilos.formularioCargaMasiva} onSubmit={importar}>
              <div className={estilos.especificacionArchivo}><p><strong>Datos requeridos:</strong></p><ul><li><strong>email / correo:</strong> correo institucional único.</li><li><strong>full_name / nombre completo:</strong> nombres y apellidos.</li><li><strong>codigo_estudiante / código estudiante:</strong> solo números.</li><li><strong>department / dependencia:</strong> Monitores Aulas de Software, Monitores Laboratorios o Monitores Física.</li></ul><p><strong>Datos opcionales:</strong></p><ul><li>numero_documento / número documento.</li><li>proyecto_curricular / proyecto curricular.</li><li>telefono / phone.</li></ul></div>
              <div className={estilos.accionesFormulario}><button type="button" className={estilos.botonSecundario} onClick={() => descargarPlantillaCarga("monitores")}>Descargar plantilla</button></div>
              <label className={estilos.archivoCarga}>Archivo Excel (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /><small>{archivo?.name ?? "Ningún archivo seleccionado"}</small></label>
              <button className="button-primary" disabled={guardando}>{guardando ? "Procesando…" : "↑ Procesar archivo"}</button>
              {resultadoCarga && <div className={estilos.resultadoImportacion}><span><b>{resultadoCarga.total_rows}</b>Filas</span><span><b>{resultadoCarga.created}</b>Creados</span><span><b>{resultadoCarga.skipped.length}</b>Omitidos</span><span><b>{resultadoCarga.errors.length}</b>Con error</span></div>}
            </form>
          </section>
        </div>
      )}
      {edicion && (
        <div className={estilos.fondoModal}>
          <section className={estilos.modal} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>Editar monitor</h2>
                <p>Actualice los datos de {edicion.full_name}.</p>
              </div>
              <button type="button" onClick={() => setEdicion(null)}>
                ×
              </button>
            </header>
            <form onSubmit={guardarEdicion}>
              <FormularioMonitor
                form={formEdicion}
                onChange={setFormEdicion}
                texto="Guardar cambios"
                guardando={guardando}
              />
            </form>
          </section>
        </div>
      )}
      {eliminando && (
        <div className={estilos.fondoModal}>
          <section className={estilos.modal} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>Eliminar monitor</h2>
                <p>Esta acción elimina la cuenta de {eliminando.full_name}.</p>
              </div>
              <button type="button" onClick={() => {
                setErrorEliminacion("");
                setEliminando(null);
              }}>
                ×
              </button>
            </header>
            <form
              className={estilos.formulario}
              onSubmit={confirmarEliminacion}
            >
              <p>Escribe tu contraseña actual para confirmar la eliminación.</p>
              {errorEliminacion && (
                <p id="error-confirmacion-eliminacion" className={estilos.errorConfirmacionEliminacion} role="alert">
                  {errorEliminacion}
                </p>
              )}
              <label className={estilos.campo}>
                <span>Contraseña</span>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={contrasena}
                  aria-invalid={Boolean(errorEliminacion)}
                  aria-describedby={errorEliminacion ? "error-confirmacion-eliminacion" : undefined}
                  onChange={(e) => {
                    setContrasena(e.target.value);
                    setErrorEliminacion("");
                  }}
                />
              </label>
              <button
                className={estilos.botonConfirmarEliminacion}
                disabled={guardando}
              >
                {guardando ? "Eliminando…" : "Eliminar monitor"}
              </button>
            </form>
          </section>
        </div>
      )}
      {semestreModal && (
        <div className={estilos.fondoModal}>
          <section className={`${estilos.modal} ${estilos.modalSemestre}`} role="dialog" aria-modal="true" aria-labelledby="titulo-semestre">
            <header>
              <div>
                <span>Administración / Iniciar semestre nuevo</span>
                <h2 id="titulo-semestre">Iniciar semestre nuevo</h2>
                <p>
                  Esta acción archiva el semestre actual y abre uno nuevo para registrar monitores, horarios y marcaciones nuevas.
                </p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => { setSemestreModal(false); setContrasenaSemestre(""); }}>
                ×
              </button>
            </header>
            <div className={estilos.semestreContenido}>
              <p className={estilos.semestreAviso}>Mensaje importante: los registros del semestre actual se conservan como histórico. Los monitores actuales quedarán inactivos para que el nuevo semestre empiece sin conflictos.</p>
              <div className={estilos.semestreColumnas}>
                <div>
                  <h3>Qué se va a archivar</h3>
                  <p>Se conservarán monitores, horarios, registros importados, jornadas procesadas, horas extra, anotaciones, inconsistencias, memorandos y reportes para consulta histórica.</p>
                  <p>Las cuentas de monitor se conservan. Si un monitor repite, podrá tener un nuevo registro activo sin perder el semestre anterior.</p>
                  <div className={estilos.semestreImpacto}>
                    {impactoSemestre.map(([clave, etiqueta]) => <div key={clave}><strong>{impacto?.[clave] ?? 0}</strong><span>{etiqueta}</span></div>)}
                  </div>
                </div>
                <form className={estilos.semestreConfirmacion} onSubmit={(evento) => { evento.preventDefault(); setErrorSemestre(""); setConfirmarFechasSemestre(true); }}>
                  <h3>Confirmación obligatoria</h3>
                  <p>Ingresa el semestre que empieza y confirma con tu contraseña de administrador.</p>
                  <label><span>Nuevo semestre académico</span><input required maxLength={20} placeholder="2026-3" value={nuevoSemestre} onChange={(e) => setNuevoSemestre(e.target.value)} /><small>Ejemplo: 2026-3</small></label>
                  <label><span>Contraseña del administrador</span><input required type="password" autoComplete="current-password" value={contrasenaSemestre} onChange={(e) => setContrasenaSemestre(e.target.value)} /></label>
                  {errorSemestre && <p role="alert" className={estilos.semestreError}>{errorSemestre}</p>}
                  <button type="submit" className="button-primary">Archivar e iniciar semestre nuevo</button>
                  <button type="button" className={estilos.botonSecundario} onClick={() => { setSemestreModal(false); setContrasenaSemestre(""); }}>Cancelar</button>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}
      {semestreModal && confirmarFechasSemestre && (
        <div className={`${estilos.fondoModal} ${estilos.fondoFechasSemestre}`}>
          <section className={`${estilos.modal} ${estilos.modalFechasSemestre}`} role="dialog" aria-modal="true" aria-labelledby="titulo-fechas-semestre">
            <header><div><h2 id="titulo-fechas-semestre">Fechas del nuevo semestre</h2><p>Confirma el periodo académico antes de archivar el semestre actual.</p></div><button type="button" aria-label="Volver" disabled={guardando} onClick={() => setConfirmarFechasSemestre(false)}>×</button></header>
            <form className={estilos.formulario} onSubmit={iniciarSemestre}>
              <div className={estilos.formularioDoble}>
                <label className={estilos.campo}><span>Fecha de inicio</span><input required type="date" value={fechaInicioSemestre} onChange={(e) => setFechaInicioSemestre(e.target.value)} /></label>
                <label className={estilos.campo}><span>Fecha de finalización</span><input required type="date" min={fechaInicioSemestre || undefined} value={fechaFinSemestre} onChange={(e) => setFechaFinSemestre(e.target.value)} /></label>
              </div>
              {errorSemestre && <p role="alert" className={estilos.semestreError}>{errorSemestre}</p>}
              <button className="button-primary" disabled={guardando}>{guardando ? "Iniciando semestre…" : `Confirmar inicio de ${nuevoSemestre}`}</button>
              <button type="button" className={estilos.botonSecundario} disabled={guardando} onClick={() => setConfirmarFechasSemestre(false)}>Volver</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
