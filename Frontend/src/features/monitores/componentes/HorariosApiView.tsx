"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import type { HorarioApi, MonitorApi } from "@/features/monitores/api/contratosMonitores";
import estilos from "./SistemaVisualMonitores.module.css";
import { AvisoTemporal } from "./AvisoTemporal";
import { SelectorDependenciaAdmin, useFiltroDependenciaAdmin } from "./FiltroDependenciaAdmin";

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
type FormHorario = { monitor: string; weekday: number; start_time: string; end_time: string; asignatura: string; grupo: string; docente: string; proyecto_curricular: string; location: string; is_active: boolean };
const vacio: FormHorario = { monitor: "", weekday: 0, start_time: "08:00:00", end_time: "12:00:00", asignatura: "", grupo: "", docente: "", proyecto_curricular: "", location: "", is_active: true };
const proyectos = [["", "Seleccione un proyecto curricular"], ["ingenieria_electronica", "Ingeniería electrónica"], ["ingenieria_sistemas", "Ingeniería de sistemas"], ["ingenieria_electrica", "Ingeniería eléctrica"], ["ingenieria_industrial", "Ingeniería industrial"], ["ingenieria_catastral", "Ingeniería catastral"], ["licenciatura_fisica", "Licenciatura en Física"]] as const;

export function HorariosApiView() {
  const [rows, setRows] = useState<HorarioApi[]>([]);
  const [monitores, setMonitores] = useState<MonitorApi[]>([]);
  const [form, setForm] = useState<FormHorario>(vacio);
  const [editando, setEditando] = useState<HorarioApi | null>(null);
  const [modalHorario, setModalHorario] = useState(false);
  const [modalCarga, setModalCarga] = useState(false);
  const [buscar, setBuscar] = useState("");
  const { esAdministrador, dependencia, setDependencia } = useFiltroDependenciaAdmin();
  const [estado, setEstado] = useState("ACTIVOS");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultadoCarga, setResultadoCarga] = useState<{ total_rows: number; created: number; skipped: unknown[]; errors: unknown[] } | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const fallo = (e: unknown, mensaje: string) => setError(e instanceof Error ? e.message : mensaje);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const [horarios, monitoresApi] = await Promise.all([servicioMonitores.listarHorarios(), servicioMonitores.listarMonitores()]);
      setRows(horarios); setMonitores(monitoresApi);
      setForm((actual) => ({ ...actual, monitor: actual.monitor || monitoresApi.find((item) => item.semester_is_active === true)?.id || "" }));
    } catch (e) { fallo(e, "No fue posible cargar los horarios."); }
    finally { setCargando(false); }
  }

  useEffect(() => { void cargar(); }, []);
  useEffect(() => {
    const monitor = monitores.find((item) => item.id === form.monitor);
    if (monitor && form.proyecto_curricular !== (monitor.proyecto_curricular ?? "")) setForm((actual) => ({ ...actual, proyecto_curricular: monitor.proyecto_curricular ?? "" }));
  }, [form.monitor, form.proyecto_curricular, monitores]);

  const monitoresActuales = useMemo(() => monitores.filter((item) => item.semester_is_active === true && item.is_active && (!dependencia || item.department === dependencia)), [monitores, dependencia]);
  const visibles = useMemo(() => {
    const estadoPorMonitor = new Map(monitores.map((monitor) => [monitor.id, monitor.is_active]));
    const textoBuscado = buscar.toLocaleLowerCase("es").trim();
    return rows.filter((item) => {
      const texto = `${item.monitor_name} ${item.location} ${item.asignatura} ${item.docente}`.toLocaleLowerCase("es");
      const activo = estadoPorMonitor.get(item.monitor) ?? false;
      return (!dependencia || monitores.find((monitor) => monitor.id === item.monitor)?.department === dependencia) && (!textoBuscado || texto.includes(textoBuscado)) && (estado === "TODOS" || (estado === "ACTIVOS" ? activo : !activo));
    }).sort((a, b) => a.monitor_name.localeCompare(b.monitor_name, "es") || a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  }, [rows, monitores, buscar, estado, dependencia]);

  const abrirNuevo = () => {
    const monitor = monitoresActuales[0];
    setEditando(null);
    setForm({ ...vacio, monitor: monitor?.id ?? "", proyecto_curricular: monitor?.proyecto_curricular ?? "" });
    setModalHorario(true);
  };
  const abrirEdicion = (item: HorarioApi) => {
    setEditando(item);
    setForm({ monitor: item.monitor, weekday: item.weekday, start_time: item.start_time, end_time: item.end_time, asignatura: item.asignatura ?? "", grupo: item.grupo ?? "", docente: item.docente ?? "", proyecto_curricular: item.proyecto_curricular ?? "", location: item.location, is_active: item.is_active });
    setModalHorario(true);
  };

  async function guardarHorario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!form.monitor) return setError("Registre primero un monitor del semestre actual para asignar un horario.");
    setGuardando(true); setError("");
    try {
      if (editando) {
        const { monitor: _monitor, ...datos } = form;
        await servicioMonitores.actualizarHorario(editando.id, datos);
        setRows(await servicioMonitores.listarHorarios());
        setAviso("Horario actualizado correctamente.");
      } else {
        const creado = await servicioMonitores.crearHorario(form);
        setRows((actual) => [creado, ...actual]);
        setAviso("Horario asignado correctamente.");
      }
      setModalHorario(false); setEditando(null);
    } catch (e) { fallo(e, "No fue posible guardar el horario."); }
    finally { setGuardando(false); }
  }

  async function importar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!archivo) return setError("Selecciona un archivo Excel (.xlsx).");
    setGuardando(true); setError("");
    try {
      const resultado = await servicioMonitores.importarHorarios(archivo);
      setResultadoCarga(resultado); setAviso(`Carga finalizada: ${resultado.created} horario(s) creado(s).`);
      await cargar();
    } catch (e) { fallo(e, "No fue posible procesar el archivo."); }
    finally { setGuardando(false); }
  }

  async function eliminar(item: HorarioApi) {
    if (!window.confirm(`¿Eliminar el horario de ${item.monitor_name}?`)) return;
    try { await servicioMonitores.eliminarHorario(item.id); setRows((actual) => actual.filter((row) => row.id !== item.id)); setAviso("Horario eliminado correctamente."); }
    catch (e) { fallo(e, "No fue posible eliminar el horario."); }
  }

  return <div className={`${estilos.gestionCuentas} ${estilos.horariosApi}`}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión académica</span><h1>Horarios</h1><p>Consulte los turnos registrados y gestione asignaciones individuales o masivas.</p></div><div className={estilos.encabezadoAcciones}><button type="button" className={estilos.botonSecundario} onClick={() => setModalCarga(true)}>Carga masiva</button><button type="button" className="button-primary" onClick={abrirNuevo}>+ Asignar horario individual</button></div></section>
    <section className={estilos.metricas}><article className={`${estilos.metrica} ${estilos.violeta}`}><span>Total</span><strong>{rows.length}</strong><small>Horarios registrados</small></article><article className={`${estilos.metrica} ${estilos.verde}`}><span>Activos</span><strong>{rows.filter((item) => item.is_active).length}</strong><small>Turnos vigentes</small></article><article className={`${estilos.metrica} ${estilos.ambar}`}><span>Inactivos</span><strong>{rows.filter((item) => !item.is_active).length}</strong><small>Turnos suspendidos</small></article><article className={`${estilos.metrica} ${estilos.azul}`}><span>Visibles</span><strong>{visibles.length}</strong><small>Según filtros actuales</small></article></section>
    {error && <AvisoTemporal mensaje={error} tipo="error" alCerrar={() => setError("")} />}{aviso && <AvisoTemporal mensaje={aviso} tipo="exito" alCerrar={() => setAviso("")} />}
    <section className={estilos.tarjeta}><header><div><h2>Horarios registrados</h2><p>Consulte y administre los turnos guardados por la API.</p></div></header><div className={estilos.barraHerramientas}><label className={estilos.campoAncho}><span>Buscar</span><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Monitor, asignatura, docente o ubicación" /></label><SelectorDependenciaAdmin visible={esAdministrador} value={dependencia} onChange={setDependencia} /><label className={estilos.campo}><span>Estado del monitor</span><select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="TODOS">Todos</option><option value="ACTIVOS">Monitores activos</option><option value="INACTIVOS">Monitores inactivos</option></select></label></div><div className={estilos.tablaContenedor}><table className={estilos.tabla}><thead><tr><th>Monitor</th><th>Día</th><th>Horario</th><th>Asignatura</th><th>Ubicación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{cargando ? <tr><td colSpan={7} className={estilos.vacio}>Cargando horarios…</td></tr> : visibles.map((item) => <tr key={item.id}><td><strong>{item.monitor_name || "Sin nombre"}</strong><small>{item.docente || "Sin docente"}</small></td><td>{dias[item.weekday] || item.weekday}</td><td>{item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}</td><td>{item.asignatura || "Sin asignatura"}{item.grupo && <small>Grupo {item.grupo}</small>}</td><td>{item.location || "Sin ubicación"}</td><td><span className={`${estilos.insignia} ${item.is_active ? estilos.exito : estilos.neutro}`}>{item.is_active ? "Activo" : "Inactivo"}</span></td><td><div className={estilos.accionesTabla}><button type="button" onClick={() => abrirEdicion(item)}>Editar</button><button type="button" className={estilos.eliminar} onClick={() => void eliminar(item)}>Eliminar</button></div></td></tr>)}{!cargando && !visibles.length && <tr><td colSpan={7} className={estilos.vacio}>No hay horarios registrados o coincidentes.</td></tr>}</tbody></table></div></section>

    {modalHorario && <div className={estilos.fondoModal}><section className={`${estilos.modal} ${estilos.modalHorarioIndividual}`} role="dialog" aria-modal="true" aria-labelledby="titulo-horario-individual"><header><div><h2 id="titulo-horario-individual">{editando ? "Editar horario" : "Nuevo horario"}</h2><p>Asigne un turno individual a un monitor del semestre actual.</p></div><button type="button" onClick={() => { setModalHorario(false); setEditando(null); }}>×</button></header><form className={estilos.formulario} onSubmit={guardarHorario}><label className={estilos.campo}><span>Monitor</span><select required disabled={Boolean(editando)} value={form.monitor} onChange={(e) => setForm({ ...form, monitor: e.target.value })}><option value="">Seleccione un monitor</option>{monitoresActuales.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><label className={estilos.campo}><span>Día</span><select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>{dias.map((dia, index) => <option key={dia} value={index}>{dia}</option>)}</select></label><div className={estilos.formularioDoble}><label className={estilos.campo}><span>Hora inicio</span><input required type="time" value={form.start_time.slice(0, 5)} onChange={(e) => setForm({ ...form, start_time: `${e.target.value}:00` })} /></label><label className={estilos.campo}><span>Hora fin</span><input required type="time" value={form.end_time.slice(0, 5)} onChange={(e) => setForm({ ...form, end_time: `${e.target.value}:00` })} /></label></div><label className={estilos.campo}><span>Ubicación</span><input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Aula, laboratorio o sede" /></label><label className={estilos.campo}><span>Asignatura</span><input value={form.asignatura} onChange={(e) => setForm({ ...form, asignatura: e.target.value })} /></label><div className={estilos.formularioDoble}><label className={estilos.campo}><span>Grupo</span><input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></label><label className={estilos.campo}><span>Docente</span><input value={form.docente} onChange={(e) => setForm({ ...form, docente: e.target.value })} /></label></div><label className={estilos.campo}><span>Proyecto curricular</span><select value={form.proyecto_curricular} onChange={(e) => setForm({ ...form, proyecto_curricular: e.target.value })}>{proyectos.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></label>{editando && <label className={estilos.verificacion}><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Horario activo</label>}<button className="button-primary" disabled={guardando || !monitoresActuales.length}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Asignar horario"}</button></form></section></div>}

    {modalCarga && <div className={estilos.fondoModal}><section className={`${estilos.modal} ${estilos.modalCargaHorarios}`} role="dialog" aria-modal="true" aria-labelledby="titulo-carga-horarios"><header><div><h2 id="titulo-carga-horarios">Carga masiva de horarios</h2><p>Use un archivo Excel con los encabezados requeridos.</p></div><button type="button" onClick={() => setModalCarga(false)}>×</button></header><form className={estilos.formularioCargaMasiva} onSubmit={importar}><div className={estilos.especificacionArchivo}><p><strong>Requeridos:</strong></p><ul><li>email_monitor / correo monitor</li><li>day / día (Lunes a Sábado)</li><li>start_time / hora inicio (06:00:00 a 22:00:00)</li><li>end_time / hora fin (06:00:00 a 22:00:00)</li><li>location / ubicación</li></ul><p><strong>Opcionales:</strong></p><ul><li>asignatura / subject</li><li>grupo / group</li><li>docente / teacher</li><li>proyecto_curricular / proyecto curricular</li></ul></div><label className={estilos.archivoCarga}>Archivo Excel (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /><small>{archivo?.name ?? "Ningún archivo seleccionado"}</small></label><button className="button-primary" disabled={guardando}>{guardando ? "Procesando…" : "↑ Procesar horarios"}</button>{resultadoCarga && <div className={estilos.resultadoImportacion}><span><b>{resultadoCarga.total_rows}</b>Filas</span><span><b>{resultadoCarga.created}</b>Creados</span><span><b>{resultadoCarga.skipped.length}</b>Omitidos</span><span><b>{resultadoCarga.errors.length}</b>Con error</span></div>}</form></section></div>}
  </div>;
}
