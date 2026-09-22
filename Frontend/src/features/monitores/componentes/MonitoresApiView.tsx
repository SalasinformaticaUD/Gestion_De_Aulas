"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adaptarMonitor } from "@/features/monitores/api/adaptadoresMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import type {
  DashboardApi,
  MonitorApi,
} from "@/features/monitores/api/contratosMonitores";
import estilos from "./SistemaVisualMonitores.module.css";
import { AvisoTemporal } from "./AvisoTemporal";

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
}: {
  form: FormMonitor;
  onChange: (form: FormMonitor) => void;
  texto: string;
  guardando: boolean;
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
      <label className={estilos.campo}>
        <span>Dependencia</span>
        <select
          required
          value={form.department}
          onChange={(e) => onChange({ ...form, department: e.target.value })}
        >
          <option value="informatics_labs">Monitores Aulas de Software</option>
          <option value="electrical">Monitores Laboratorios</option>
          <option value="physics">Monitores Fisica</option>
        </select>
      </label>
      <button className="button-primary" disabled={guardando}>
        {guardando ? "Procesando…" : texto}
      </button>
    </div>
  );
}

export function MonitoresApiView() {
  const [rows, setRows] = useState<MonitorApi[]>([]);
  const [form, setForm] = useState(vacio);
  const [buscar, setBuscar] = useState("");
  const [semestreFiltro, setSemestreFiltro] = useState("ACTUAL");
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
  const [semestreModal, setSemestreModal] = useState(false);
  const [nuevoSemestre, setNuevoSemestre] = useState("");
  const [fechaInicioSemestre, setFechaInicioSemestre] = useState("");
  const [fechaFinSemestre, setFechaFinSemestre] = useState("");
  const [impacto, setImpacto] = useState<Record<string, number> | null>(null);
  const fallo = (e: unknown, fallback: string) =>
    setError(e instanceof Error ? e.message : fallback);
  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [monitores, dashboard] = await Promise.all([
        servicioMonitores.listarMonitores(),
        servicioMonitores.obtenerDashboard(),
      ]);
      setRows(monitores);
      setAlertasPorMonitor(
        Object.fromEntries(
          dashboard.monitor_rows.map((fila) => [
            fila.monitor_id,
            {
              late_count: fila.late_count,
              memorandums_count: fila.memorandums_count,
            },
          ]),
        ),
      );
    } catch (e) {
      fallo(e, "No fue posible cargar los monitores.");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    void cargar();
  }, []);
  const visibles = useMemo(() => {
    return rows.filter((item) => {
        const texto =
          `${item.full_name} ${item.codigo_estudiante} ${item.user_email ?? ""}`.toLocaleLowerCase(
            "es",
          );
        return (
          (!buscar || texto.includes(buscar.toLocaleLowerCase("es"))) &&
          (semestreFiltro === "ACTUAL"
            ? item.semester_is_active === true
            : item.semester === semestreFiltro)
        );
      }).sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
  }, [rows, buscar, semestreFiltro]);
  const semestres = useMemo(() => [...new Set(rows.map((item) => item.semester).filter((item): item is string => Boolean(item)))], [rows]);
  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const creado = await servicioMonitores.provisionarMonitor(form);
      setRows((actual) => [creado, ...actual]);
      setForm(vacio);
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
    try {
      const respuesta = await servicioMonitores.reenviarActivacion(item.id);
      setAviso(respuesta.detail);
    } catch (e) {
      fallo(e, "No fue posible reenviar el correo.");
    }
  }
  async function confirmarEliminacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!eliminando) return;
    setGuardando(true);
    try {
      const validacion =
        await servicioMonitores.verificarContrasenaActual(contrasena);
      if (!validacion.valido) {
        setError("La contraseña no es válida.");
        return;
      }
      await servicioMonitores.eliminarMonitor(eliminando.id);
      setRows((actual) => actual.filter((row) => row.id !== eliminando.id));
      setEliminando(null);
      setContrasena("");
      setAviso("Monitor eliminado correctamente.");
    } catch (e) {
      fallo(e, "No fue posible eliminar el monitor.");
    } finally {
      setGuardando(false);
    }
  }
  async function abrirSemestre() {
    setError("");
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
    setGuardando(true);
    try {
      const resultado =
        await servicioMonitores.iniciarNuevoSemestre(nuevoSemestre, fechaInicioSemestre, fechaFinSemestre);
        setSemestreModal(false);
        setNuevoSemestre("");
        setFechaInicioSemestre("");
        setFechaFinSemestre("");
      setAviso(
        `Se inició el semestre ${resultado.new_semester}. Los registros históricos se conservaron.`,
      );
      await cargar();
    } catch (e) {
      fallo(e, "No fue posible iniciar el semestre.");
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
          <button
            type="button"
            className={estilos.botonSecundario}
            onClick={() => void abrirSemestre()}
          >
            Iniciar semestre nuevo
          </button>
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
          <strong>{rows.length}</strong>
          <small>Registros en la API</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.verde}`}>
          <span>Activos</span>
          <strong>{rows.filter((item) => estadoCuenta(item) === "ACTIVE").length}</strong>
          <small>Cuenta activada</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.ambar}`}>
          <span>Pendientes</span>
          <strong>{rows.filter((item) => estadoCuenta(item) === "PENDING").length}</strong>
          <small>Correo enviado; falta activar cuenta</small>
        </article>
        <article className={`${estilos.metrica} ${estilos.azul}`}>
          <span>Inactivos</span>
          <strong>{rows.filter((item) => estadoCuenta(item) === "INACTIVE").length}</strong>
          <small>Sin operación vigente</small>
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
            <button
              type="button"
              className={estilos.botonSecundario}
              onClick={() => void cargar()}
              disabled={cargando}
            >
              Actualizar
            </button>
          </header>
          <div className={estilos.barraHerramientas}>
            <label className={estilos.campoAncho}>
              <span>Buscar</span>
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Nombre, código o correo"
              />
            </label>
            <label className={estilos.campo}>
              <span>Semestre</span>
              <select
                value={semestreFiltro}
                onChange={(e) => setSemestreFiltro(e.target.value)}
              >
                <option value="ACTUAL">Semestre actual</option>
                {semestres.filter((semestre) => !rows.some((item) => item.semester === semestre && item.semester_is_active === true)).map((semestre) => <option key={semestre} value={semestre}>{semestre}</option>)}
              </select>
            </label>
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
                            {estadoCuenta(item) === "PENDING" && <button type="button" onClick={() => void reenviar(item)}>Reenviar correo</button>}
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
                              onClick={() => setEliminando(item)}
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
      </section>
      {crearModal && (
        <div className={estilos.fondoModal}>
          <section className={`${estilos.modal} ${estilos.modalFormularioMonitor}`} role="dialog" aria-modal="true" aria-labelledby="titulo-crear-monitor">
            <header><div><h2 id="titulo-crear-monitor">Crear monitor</h2><p>Se valida código, correo y documento antes de registrar la cuenta.</p></div><button type="button" onClick={() => setCrearModal(false)}>×</button></header>
            <form onSubmit={crear}><FormularioMonitor form={form} onChange={setForm} texto="+ Crear y enviar activación" guardando={guardando} /></form>
          </section>
        </div>
      )}
      {cargaModal && (
        <div className={estilos.fondoModal}>
          <section className={`${estilos.modal} ${estilos.modalCargaMonitores}`} role="dialog" aria-modal="true" aria-labelledby="titulo-carga-monitores">
            <header><div><h2 id="titulo-carga-monitores">Carga masiva de monitores</h2><p>Seleccione un Excel con los encabezados indicados.</p></div><button type="button" onClick={() => setCargaModal(false)}>×</button></header>
            <form className={estilos.formularioCargaMasiva} onSubmit={importar}>
              <div className={estilos.especificacionArchivo}><p><strong>Datos requeridos:</strong></p><ul><li><strong>email / correo:</strong> correo institucional único.</li><li><strong>full_name / nombre completo:</strong> nombres y apellidos.</li><li><strong>codigo_estudiante / código estudiante:</strong> solo números.</li><li><strong>department / dependencia:</strong> Monitores Aulas de Software, Monitores Laboratorios o Monitores Física.</li></ul><p><strong>Datos opcionales:</strong></p><ul><li>numero_documento / número documento.</li><li>proyecto_curricular / proyecto curricular.</li><li>telefono / phone.</li></ul></div>
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
              <button type="button" onClick={() => setEliminando(null)}>
                ×
              </button>
            </header>
            <form
              className={estilos.formulario}
              onSubmit={confirmarEliminacion}
            >
              <p>Escribe tu contraseña actual para confirmar la eliminación.</p>
              <label className={estilos.campo}>
                <span>Contraseña</span>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
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
          <section className={estilos.modal} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>Iniciar semestre nuevo</h2>
                <p>
                  Esta operación archiva el semestre actual y desactiva
                  monitores y horarios vigentes.
                </p>
              </div>
              <button type="button" onClick={() => setSemestreModal(false)}>
                ×
              </button>
            </header>
            <form className={estilos.formulario} onSubmit={iniciarSemestre}>
              {impacto && (
                <div className={estilos.resultadoImportacion}>
                  {Object.entries(impacto)
                    .slice(0, 4)
                    .map(([clave, valor]) => (
                      <span key={clave}>
                        <b>{valor}</b>
                        {clave.replaceAll("_", " ")}
                      </span>
                    ))}
                </div>
              )}
              <label className={estilos.campo}>
                <span>Nombre del nuevo semestre</span>
                <input
                  required
                  placeholder="Ej.: 2026-3"
                  value={nuevoSemestre}
                  onChange={(e) => setNuevoSemestre(e.target.value)}
                />
              </label>
              <div className={estilos.formularioDoble}>
                <label className={estilos.campo}><span>Fecha de inicio</span><input required type="date" value={fechaInicioSemestre} onChange={(e) => setFechaInicioSemestre(e.target.value)} /></label>
                <label className={estilos.campo}><span>Fecha de finalización</span><input required type="date" min={fechaInicioSemestre || undefined} value={fechaFinSemestre} onChange={(e) => setFechaFinSemestre(e.target.value)} /></label>
              </div>
              <button className="button-primary" disabled={guardando}>
                Confirmar inicio de semestre
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
