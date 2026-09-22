"use client";

import { useMemo, useState, type FormEvent } from "react";
import { codigoDependencia, nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import type { ExcepcionApi, HorarioApi, MonitorApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { Paginacion } from "./Paginacion";
import { AvisoTemporal } from "./AvisoTemporal";
import estilos from "./SistemaVisualMonitores.module.css";

type FormularioExcepcion = {
  nombre: string; descripcion: string; fechaInicio: string; fechaFin: string;
  dependencia: string; ignorarRetrasos: boolean; aprobarHorasExtra: boolean;
  activa: boolean; todoElSemestre: boolean; usuarios: string[]; bloques: string[];
};

const hoy = () => new Date().toISOString().slice(0, 10);
const crearFormulario = (): FormularioExcepcion => ({
  nombre: "", descripcion: "", fechaInicio: hoy(), fechaFin: hoy(), dependencia: "TODAS",
  ignorarRetrasos: true, aprobarHorasExtra: false, activa: true, todoElSemestre: false,
  usuarios: [], bloques: [],
});
const opcionesDependencia = ["Monitores Física", "Monitores Aulas de Software", "Monitores Laboratorios"];
const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function GestionExcepciones() {
  const recurso = usarRecursoApi(servicioMonitores.listarExcepciones, [] as ExcepcionApi[]);
  const recursoMonitores = usarRecursoApi(servicioMonitores.listarMonitores, [] as MonitorApi[]);
  const recursoHorarios = usarRecursoApi(servicioMonitores.listarHorarios, [] as HorarioApi[]);
  const [edicion, setEdicion] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<FormularioExcepcion>(crearFormulario);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState<"usuarios" | "bloques" | null>(null);
  const monitoresPorId = useMemo(() => new Map(recursoMonitores.datos.map((item) => [item.id, item])), [recursoMonitores.datos]);
  const horariosSeleccionables = useMemo(
    () => recursoHorarios.datos.filter((item) => formulario.usuarios.includes(item.monitor)),
    [recursoHorarios.datos, formulario.usuarios],
  );
  const usuariosDisponibles = useMemo(() => {
    const codigo = formulario.dependencia === "TODAS" ? null : codigoDependencia(formulario.dependencia);
    return recursoMonitores.datos.filter((monitor) => monitor.is_active && (!codigo || monitor.department === codigo));
  }, [recursoMonitores.datos, formulario.dependencia]);
  const horariosPorId = useMemo(() => new Map(recursoHorarios.datos.map((item) => [item.id, item])), [recursoHorarios.datos]);
  const ordenadas = useMemo(() => [...recurso.datos].sort((a, b) => b.start_date.localeCompare(a.start_date)), [recurso.datos]);
  const paginacion = usarPaginacion(ordenadas, 8);

  const alternar = (campo: "usuarios" | "bloques", id: string) => setFormulario((actual) => {
    const incluye = actual[campo].includes(id);
    const siguiente = incluye ? actual[campo].filter((valor) => valor !== id) : [...actual[campo], id];
    if (campo !== "usuarios") return { ...actual, bloques: siguiente };
    const bloquesValidos = actual.bloques.filter((bloqueId) => {
      const bloque = horariosPorId.get(bloqueId);
      return bloque && siguiente.includes(bloque.monitor);
    });
    return { ...actual, usuarios: siguiente, bloques: bloquesValidos };
  });
  const cambiarDependencia = (dependencia: string) => setFormulario((actual) => {
    const codigo = dependencia === "TODAS" ? null : codigoDependencia(dependencia);
    const usuarios = actual.usuarios.filter((id) => {
      const monitor = monitoresPorId.get(id);
      return monitor?.is_active && (!codigo || monitor.department === codigo);
    });
    const bloques = actual.bloques.filter((id) => usuarios.includes(horariosPorId.get(id)?.monitor ?? ""));
    return { ...actual, dependencia, usuarios, bloques };
  });

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!formulario.todoElSemestre && formulario.fechaFin < formulario.fechaInicio) {
      setAviso("La fecha final no puede ser anterior a la fecha inicial.");
      return;
    }
    setGuardando(true); setAviso("");
    const payload = {
      name: formulario.nombre, description: formulario.descripcion,
      start_date: formulario.fechaInicio, end_date: formulario.fechaFin,
      department: formulario.dependencia === "TODAS" ? null : codigoDependencia(formulario.dependencia),
      ignore_lateness: formulario.ignorarRetrasos, approve_overtime: formulario.aprobarHorasExtra,
      is_active: edicion ? formulario.activa : true, all_semester: formulario.todoElSemestre,
      monitors: formulario.usuarios, schedules: formulario.bloques,
    };
    try {
      const guardada = edicion
        ? await servicioMonitores.actualizarExcepcion(edicion, payload)
        : await servicioMonitores.crearExcepcion(payload);
      recurso.setDatos((actual) => edicion ? actual.map((item) => item.id === edicion ? guardada : item) : [guardada, ...actual]);
      setFormulario(crearFormulario()); setEdicion(null);
      setAviso("La excepción fue guardada y las sesiones afectadas se recalcularon.");
    } catch (problema) {
      setAviso(problema instanceof Error ? problema.message : "No fue posible guardar la excepción.");
    } finally { setGuardando(false); }
  };

  const editar = (item: ExcepcionApi) => {
    setEdicion(item.id);
    setFormulario({
      nombre: item.name, descripcion: item.description, fechaInicio: item.start_date, fechaFin: item.end_date,
      dependencia: item.department ? nombreDependencia(item.department) : "TODAS", ignorarRetrasos: item.ignore_lateness,
      aprobarHorasExtra: item.approve_overtime, activa: item.is_active, todoElSemestre: item.all_semester,
      usuarios: item.monitors, bloques: item.schedules,
    });
  };

  const eliminar = async (id: string) => {
    try {
      await servicioMonitores.eliminarExcepcion(id);
      recurso.setDatos((actual) => actual.filter((item) => item.id !== id));
      setAviso("Excepción eliminada correctamente.");
    } catch (problema) { setAviso(problema instanceof Error ? problema.message : "No fue posible eliminar la excepción."); }
  };

  const etiquetaHorario = (horario: HorarioApi) => `${monitoresPorId.get(horario.monitor)?.full_name ?? "Monitor"} · ${dias[horario.weekday]} ${horario.start_time.slice(0, 5)}–${horario.end_time.slice(0, 5)}`;
  return <div className={estilos.vistaExcepciones}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Periodos especiales</span><h1>Excepciones de horarios</h1><p>Configure periodos que modifican el cálculo de retrasos u horas extra.</p></div><span className={`${estilos.insignia} ${estilos.informacion}`}>Alcance configurable</span></section>
    <div className={estilos.aviso}><strong>Estados:</strong> Activa está dentro del rango; Próxima a iniciar aún no inicia; Finalizada terminó; Inactiva no afecta sesiones.</div>
    {(recurso.error || recursoMonitores.error || recursoHorarios.error) && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{recurso.error || recursoMonitores.error || recursoHorarios.error}</div>}
    {aviso && <AvisoTemporal mensaje={aviso} tipo={aviso.includes("correctamente") || aviso.includes("guardada") ? "exito" : "error"} alCerrar={() => setAviso("")} />}
    <div className={estilos.distribucionFormulario}>
      <section className={`${estilos.tarjeta} ${estilos.formularioFijo}`}><header><div><h2>{edicion ? "Editar excepción" : "Nueva excepción"}</h2><p>Puede aplicarla a usuarios específicos y a sus bloques horarios.</p></div>{edicion && <button type="button" className={estilos.botonSecundario} onClick={() => { setEdicion(null); setFormulario(crearFormulario()); }}>Cancelar</button>}</header>
        <form className={estilos.formulario} onSubmit={guardar}>
          <label className={estilos.campo}><span>Nombre</span><input value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} required /></label>
          <label className={estilos.campo}><span>Descripción</span><textarea value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} /></label>
          <label className={estilos.verificacion}><input type="checkbox" checked={formulario.todoElSemestre} onChange={(e) => setFormulario({ ...formulario, todoElSemestre: e.target.checked })} /><span><strong>Todo el semestre académico</strong><br />Usa automáticamente las fechas configuradas para el semestre activo.</span></label>
          <div className={estilos.formularioDoble} style={{ gridTemplateColumns: "1fr" }}><label className={estilos.campo}><span>Fecha inicial</span><input type="date" disabled={formulario.todoElSemestre} value={formulario.fechaInicio} onChange={(e) => setFormulario({ ...formulario, fechaInicio: e.target.value })} required={!formulario.todoElSemestre} /></label><label className={estilos.campo}><span>Fecha final</span><input type="date" disabled={formulario.todoElSemestre} value={formulario.fechaFin} onChange={(e) => setFormulario({ ...formulario, fechaFin: e.target.value })} required={!formulario.todoElSemestre} /></label></div>
          <label className={estilos.campo}><span>Dependencia</span><select value={formulario.dependencia} onChange={(e) => cambiarDependencia(e.target.value)}><option value="TODAS">Todas las dependencias</option>{opcionesDependencia.map((item) => <option key={item}>{item}</option>)}</select></label>
          <section className={estilos.selectorMultiple}>
            <header><span>Usuarios incluidos <small>(requerido)</small></span><small>{formulario.usuarios.length} seleccionado(s)</small></header>
            <button type="button" className={estilos.activadorSelector} disabled={!usuariosDisponibles.length} onClick={() => setSelectorAbierto((actual) => actual === "usuarios" ? null : "usuarios")}>{usuariosDisponibles.length ? (formulario.usuarios.length ? "Agregar o quitar usuarios" : "Seleccionar usuarios") : "No hay monitores activos en esta dependencia"}<span aria-hidden="true">{selectorAbierto === "usuarios" ? "▴" : "▾"}</span></button>
            {selectorAbierto === "usuarios" && <div className={estilos.listaDesplegable} role="group" aria-label="Usuarios disponibles">{usuariosDisponibles.map((item) => <label key={item.id}><input type="checkbox" checked={formulario.usuarios.includes(item.id)} onChange={() => alternar("usuarios", item.id)} /><span><strong>{item.full_name}</strong><small>{item.codigo_estudiante} · {nombreDependencia(item.department)}</small></span></label>)}</div>}
            <div className={estilos.etiquetasSeleccionadas}>{formulario.usuarios.map((id) => { const monitor = monitoresPorId.get(id); return <span key={id}>{monitor ? `${monitor.full_name} · ${monitor.codigo_estudiante}` : "Monitor no disponible"}<button type="button" onClick={() => alternar("usuarios", id)} aria-label={`Quitar ${monitor?.full_name ?? "monitor"}`}>×</button></span>; })}{!formulario.usuarios.length && <small>Selecciona uno o varios monitores desde la lista.</small>}</div>
          </section>
          <section className={estilos.selectorMultiple} aria-disabled={!formulario.usuarios.length}>
            <header><span>Bloques horarios <small>(requerido)</small></span><small>{formulario.bloques.length} seleccionado(s)</small></header>
            <button type="button" className={estilos.activadorSelector} disabled={!formulario.usuarios.length || !horariosSeleccionables.length} onClick={() => setSelectorAbierto((actual) => actual === "bloques" ? null : "bloques")}>{!formulario.usuarios.length ? "Primero selecciona usuarios" : horariosSeleccionables.length ? (formulario.bloques.length ? "Agregar o quitar bloques" : "Seleccionar bloques horarios") : "Los monitores no tienen horarios"}<span aria-hidden="true">{selectorAbierto === "bloques" ? "▴" : "▾"}</span></button>
            {selectorAbierto === "bloques" && <div className={estilos.listaDesplegable} role="group" aria-label="Bloques horarios disponibles">{horariosSeleccionables.map((item) => <label key={item.id}><input type="checkbox" checked={formulario.bloques.includes(item.id)} onChange={() => alternar("bloques", item.id)} /><span><strong>{dias[item.weekday]} {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}</strong><small>{monitoresPorId.get(item.monitor)?.full_name ?? "Monitor"} · {item.asignatura || item.location}</small></span></label>)}</div>}
            <div className={estilos.etiquetasSeleccionadas}>{formulario.bloques.map((id) => { const horario = horariosPorId.get(id); return <span key={id}>{horario ? etiquetaHorario(horario) : "Bloque no disponible"}<button type="button" onClick={() => alternar("bloques", id)} aria-label="Quitar bloque">×</button></span>; })}{!formulario.bloques.length && <small>Selecciona los horarios a los que aplica la excepción.</small>}</div>
          </section>
          <label className={estilos.verificacion}><input type="checkbox" checked={formulario.ignorarRetrasos} onChange={(e) => setFormulario({ ...formulario, ignorarRetrasos: e.target.checked })} /><span><strong>No contar retrasos</strong><br />Exime la tardanza durante el periodo.</span></label>
          <label className={estilos.verificacion}><input type="checkbox" checked={formulario.aprobarHorasExtra} onChange={(e) => setFormulario({ ...formulario, aprobarHorasExtra: e.target.checked })} /><span><strong>Contar horas extra</strong><br />Aprueba automáticamente el tiempo adicional.</span></label>
          {edicion && <label className={estilos.verificacion}><input type="checkbox" checked={formulario.activa} onChange={(e) => setFormulario({ ...formulario, activa: e.target.checked })} /><span><strong>Excepción activa</strong></span></label>}
          <button className="button-primary" type="submit" disabled={guardando || !formulario.usuarios.length || !formulario.bloques.length}>{guardando ? "Guardando…" : edicion ? "Guardar cambios" : "Crear excepción"}</button>
        </form>
      </section>
      <section className={estilos.tarjeta}><header><div><h2>Excepciones registradas</h2><p>Periodos visibles para el líder actual.</p></div></header><div className={estilos.tablaContenedor}><table className={estilos.tabla}><thead><tr><th>Nombre</th><th>Usuarios</th><th>Bloques</th><th>Fechas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{paginacion.visibles.map((item) => { const estado = estadoExcepcion(item); return <tr key={item.id}><td><strong>{item.name}</strong><small>{item.description || nombreDependencia(item.department)}</small></td><td>{etiquetas(item.monitors.map((id) => monitoresPorId.get(id)?.full_name ?? "Usuario eliminado"), "Toda la dependencia")}</td><td>{etiquetas(item.schedules.map((id) => { const horario = horariosPorId.get(id); return horario ? `${dias[horario.weekday]} ${horario.start_time.slice(0, 5)}–${horario.end_time.slice(0, 5)}` : "Bloque eliminado"; }), "Todos los bloques")}</td><td>{item.all_semester ? <><strong>Todo el semestre</strong><small>{item.start_date} hasta {item.end_date}</small></> : <>{item.start_date}<small>hasta {item.end_date}</small></>}</td><td><span className={`${estilos.insignia} ${estado.clase}`}>{estado.texto}</span></td><td><div className={estilos.accionesTabla}><button type="button" onClick={() => editar(item)}>Editar</button><button type="button" className={estilos.eliminar} onClick={() => void eliminar(item.id)}>Eliminar</button></div></td></tr>; })}{!recurso.cargando && !ordenadas.length && <tr><td colSpan={6} className={estilos.vacio}>No hay excepciones registradas.</td></tr>}</tbody></table></div><Paginacion {...paginacion} total={ordenadas.length} /></section>
    </div>
  </div>;
}

function etiquetas(valores: string[], vacio: string) { return valores.length ? <>{valores.slice(0, 2).map((valor) => <small key={valor}>{valor}</small>)}{valores.length > 2 && <small>+{valores.length - 2} más</small>}</> : <small>{vacio}</small>; }
function estadoExcepcion(item: ExcepcionApi) { const fecha = hoy(); if (!item.is_active) return { texto: "Inactiva", clase: estilos.neutro }; if (item.start_date > fecha) return { texto: "Próxima a iniciar", clase: estilos.informacion }; if (item.end_date < fecha) return { texto: "Finalizada", clase: estilos.advertencia }; return { texto: "Activa", clase: estilos.exito }; }
