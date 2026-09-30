"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  consultarDisponibilidad,
  consultarResumenDia,
  type DisponibilidadApi,
  type ResumenDisponibilidadDiaApi,
} from "@/features/disponibilidad/api/disponibilidadApi";
import { consultarResumenPanel, type ResumenPanelOperativo } from "@/features/dashboard/api/panelOperativoApi";
import styles from "./AvailabilityView.module.css";

type View = "bloque" | "dia" | "tareas";

const estados: Record<string, string> = {
  disponible: "Disponible",
  ocupada: "En clase",
  reservada: "Reservada",
  mantenimiento: "Mantenimiento",
  bloqueada: "Bloqueada",
};
const estadosCompactos: Record<string, string> = { ...estados, disponible: "Libre" };
const estadosAsistencia: Record<string, string> = { ASISTIO: "Asistió", AUSENTE: "No asistió", PENDIENTE: "Pendiente" };
const bloques = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

function bloqueActualBogota() {
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const inicio = Math.min(20, Math.max(6, 6 + Math.floor((hora - 6) / 2) * 2));
  return `${String(inicio).padStart(2, "0")}:00`;
}

export function AvailabilityView() {
  const [view, setView] = useState<View>("bloque");
  const [fecha, setFecha] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()));
  const [horaInicio, setHoraInicio] = useState(bloqueActualBogota);
  const [resultados, setResultados] = useState<DisponibilidadApi[]>([]);
  const [resumenDia, setResumenDia] = useState<ResumenDisponibilidadDiaApi | null>(null);
  const [resumenTareas, setResumenTareas] = useState<ResumenPanelOperativo | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [busquedaDia, setBusquedaDia] = useState("");
  const [filtroDia, setFiltroDia] = useState("todos");
  const [error, setError] = useState<string | null>(null);
  const horaFin = `${String(Number(horaInicio.slice(0, 2)) + 2).padStart(2, "0")}:00`;

  const cargarBloque = useCallback(async () => {
    try {
      setError(null);
      setResultados(await consultarDisponibilidad(fecha, horaInicio, horaFin));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible consultar disponibilidad.");
    }
  }, [fecha, horaInicio, horaFin]);

  const cargarDia = useCallback(async () => {
    try {
      setError(null);
      setResumenDia(await consultarResumenDia(fecha));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible consultar la disponibilidad del día.");
    }
  }, [fecha]);

  const cargarTareas = useCallback(async () => {
    try {
      setError(null);
      setResumenTareas(await consultarResumenPanel(fecha, undefined, false, horaInicio));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible consultar las tareas operativas.");
    }
  }, [fecha, horaInicio]);

  useEffect(() => {
    const cargar = view === "bloque" ? cargarBloque : view === "dia" ? cargarDia : cargarTareas;
    void cargar();
    const timer = window.setInterval(() => void cargar(), 60000);
    return () => window.clearInterval(timer);
  }, [cargarBloque, cargarDia, cargarTareas, view]);

  const visibles = useMemo(
    () => resultados.filter((item) => filtro === "todos" || item.estadoCalculado === filtro),
    [filtro, resultados],
  );

  return <>
    <section className={`page-heading ${styles.heading}`}>
      <div><h1>Disponibilidad de Aulas</h1><p>Estado calculado con clases, asistencia, reservas y restricciones operativas.</p></div>
      <div className={styles.calculated}>Actualizado · {fecha}{view === "bloque" || view === "tareas" ? ` · ${horaInicio}–${horaFin}` : " · Jornada completa"}</div>
    </section>

    <nav className={styles.viewTabs} aria-label="Vistas de disponibilidad">
      <button type="button" className={view === "bloque" ? styles.active : ""} aria-current={view === "bloque" ? "page" : undefined} onClick={() => setView("bloque")}>Por bloque</button>
      <button type="button" className={view === "dia" ? styles.active : ""} aria-current={view === "dia" ? "page" : undefined} onClick={() => setView("dia")}>Todo el día</button>
      <button type="button" className={view === "tareas" ? styles.active : ""} aria-current={view === "tareas" ? "page" : undefined} onClick={() => setView("tareas")}>Tareas operativas</button>
    </nav>

    <section className={`${styles.timePanel} ${view === "dia" ? styles.dayTimePanel : view === "tareas" ? styles.tasksTimePanel : ""}`}>
      <label className={styles.control}><span>Fecha</span><input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label>
      {(view === "bloque" || view === "tareas") && <label className={styles.control}><span>Bloque</span><select value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)}>{bloques.map((bloque) => <option key={bloque} value={bloque}>{bloque}–{String(Number(bloque.slice(0, 2)) + 2).padStart(2, "0")}:00</option>)}</select></label>}
      {view === "dia" && <div className={styles.dayRange}><span>Jornada consultada</span><strong>{resumenDia ? `${resumenDia.rangoOperativo.horaInicio}–${resumenDia.rangoOperativo.horaFin}` : "06:00–22:00"}</strong><small>Bloques de dos horas</small></div>}
      {view === "tareas" && <div className={styles.dayRange}><span>Vista de tareas</span><strong>{resumenTareas?.bloqueReferencia.horaInicio ?? "—"}–{resumenTareas?.bloqueReferencia.horaFin ?? "—"}</strong><small>Recomendaciones de disponibilidad</small></div>}
    </section>

    {error && <p className={styles.empty}>{error}</p>}
    {view === "bloque"
      ? <BlockAvailability resultados={resultados} visibles={visibles} filtro={filtro} onFilter={setFiltro} />
      : view === "dia"
        ? <DailyAvailability resumen={resumenDia} query={busquedaDia} filter={filtroDia} onQuery={setBusquedaDia} onFilter={setFiltroDia} />
        : <OperationalTasks resumen={resumenTareas} />}
  </>;
}

function OperationalTasks({ resumen }: { resumen: ResumenPanelOperativo | null }) {
  const tareasPorAula = useMemo(
    () => (resumen?.alertas.filter((alerta) => alerta.tipo === "tarea-operativa") ?? [])
      .reduce<Array<{ aula: string; tareas: ResumenPanelOperativo["alertas"] }>>((grupos, tarea) => {
        const aula = tarea.aulaCodigo ?? "Sin aula asignada";
        const grupo = grupos.find((actual) => actual.aula === aula);
        if (grupo) grupo.tareas.push(tarea);
        else grupos.push({ aula, tareas: [tarea] });
        return grupos;
      }, [])
      .sort((a, b) => {
        if (a.aula === "Sin aula asignada") return 1;
        if (b.aula === "Sin aula asignada") return -1;
        return a.aula.localeCompare(b.aula, "es", { numeric: true });
      }),
    [resumen],
  );
  const totalTareas = tareasPorAula.reduce((total, grupo) => total + grupo.tareas.length, 0);

  return <section className={styles.tasksCard}>
    <header><div><h2>Tareas operativas por bloque</h2><p>Recomendaciones para el bloque seleccionado, organizadas por aula.</p></div><span>{totalTareas} pendiente{totalTareas === 1 ? "" : "s"}</span></header>
    <div className={styles.tasksList}>
      {tareasPorAula.length ? tareasPorAula.map((grupo) => <section className={styles.taskRoom} key={grupo.aula}>
        <h3>{grupo.aula === "Sin aula asignada" ? grupo.aula : `Aula ${grupo.aula}`}</h3>
        {grupo.tareas.map((tarea) => <article key={tarea.id} className={styles[`task_${tarea.severidad}`]}>
          <header><span>{tarea.severidad}</span></header>
          <p>{tarea.mensaje}</p>
          <Link href={tarea.enlace ?? "/tareas"}>{tarea.accion ?? "Revisar tarea"} →</Link>
        </article>)}
      </section>) : <div className={styles.empty}>No hay tareas operativas pendientes para este bloque.</div>}
    </div>
  </section>;
}

function BlockAvailability({ resultados, visibles, filtro, onFilter }: { resultados: DisponibilidadApi[]; visibles: DisponibilidadApi[]; filtro: string; onFilter: (value: string) => void }) {
  return <>
    <section className={styles.statusBar}>
      {["todos", ...Object.keys(estados)].map((estado) => {
        const cantidad = estado === "todos" ? resultados.length : resultados.filter((item) => item.estadoCalculado === estado).length;
        return <button key={estado} type="button" className={`${styles.statusMetric} ${styles[`statusMetric_${estado}`] ?? ""} ${filtro === estado ? styles.statusActive : ""}`} onClick={() => onFilter(estado)}><div><span>{estado === "todos" ? "Todas las aulas" : estados[estado]}</span><strong>{cantidad}</strong><small>{estado === "todos" ? "Total consultado" : `Aulas ${estados[estado].toLowerCase()}`}</small></div><i aria-hidden="true" /></button>;
      })}
    </section>
    <section className={styles.floorGroup}>
      <div className={styles.roomGrid}>{visibles.map((item) => {
        const fuenteClase = item.fuentes.find((fuente) => fuente.tipo === "clase-programada");
        const asistencia = fuenteClase?.estado;
        const estado = item.estadoCalculado;
        return <article key={item.aula.id} className={`${styles.roomCard} ${styles[`border_${estado}`] ?? ""}`}><header><div className={styles.roomIdentity}><span>{item.aula.codigo}</span><div><h3>Aula {item.aula.codigo}</h3><p>{item.aula.capacidad} puestos</p></div></div><b className={`${styles.stateBadge} ${styles[`tone_${estado}`] ?? ""}`}><i aria-hidden="true" />{estados[estado] ?? estado}</b></header><div className={styles.activity}><span>{item.aula.ubicacion}</span><strong>{item.motivo}</strong>{asistencia && <em className={`${styles.attendanceBadge} ${styles[`attendance_${asistencia}`] ?? ""}`}>Asistencia: {estadosAsistencia[asistencia] ?? asistencia}</em>}<p>{item.fuentes.map((fuente) => `${fuente.tipo}: ${fuente.descripcion}`).join(" · ") || "Sin fuentes que bloqueen el aula."}</p></div></article>;
      })}</div>
      {!visibles.length && <div className={styles.empty}>No hay aulas para la consulta seleccionada.</div>}
    </section>
  </>;
}

function DailyAvailability({ resumen, query, filter, onQuery, onFilter }: { resumen: ResumenDisponibilidadDiaApi | null; query: string; filter: string; onQuery: (value: string) => void; onFilter: (value: string) => void }) {
  const rows = useMemo(() => {
    if (!resumen?.bloques.length) return [];
    const normalized = query.trim().toLocaleLowerCase("es");
    return resumen.bloques[0].aulas.filter((room) => {
      const matchesText = !normalized || `${room.aula.codigo} ${room.aula.ubicacion}`.toLocaleLowerCase("es").includes(normalized);
      const matchesState = filter === "todos" || resumen.bloques.some((block) => block.aulas.some((item) => item.aula.id === room.aula.id && item.estadoCalculado === filter));
      return matchesText && matchesState;
    });
  }, [filter, query, resumen]);

  return <>
    <section className={styles.summaryTools}>
      <label className={`${styles.control} ${styles.searchControl}`}><span>Buscar aula</span><div><i aria-hidden="true">⌕</i><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Código o ubicación" /></div></label>
      <label className={styles.control}><span>Estado</span><select value={filter} onChange={(event) => onFilter(event.target.value)}><option value="todos">Todos</option>{Object.entries(estados).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className={styles.legend} aria-label="Estados de disponibilidad">{Object.entries(estadosCompactos).map(([value, label]) => <span key={value}><i className={styles[`legend_${value}`]} />{label}</span>)}</div>
    </section>

    <section className={styles.dailyCard}>
      <header><div><h2>Disponibilidad durante el día</h2><p>{formatDay(resumen?.fecha)} · {rows.length} aula{rows.length === 1 ? "" : "s"}</p></div><span>{resumen?.bloques.length ?? 8} bloques</span></header>
      {resumen && rows.length > 0 ? <div className={styles.dailyTableWrap}><table className={styles.dailyTable}><thead><tr><th scope="col">Aula</th>{resumen.bloques.map((block) => <th scope="col" key={block.horaInicio}><strong>{block.horaInicio}</strong><small>{block.horaFin}</small></th>)}</tr></thead><tbody>{rows.map((room) => <tr key={room.aula.id}><th scope="row"><strong>{room.aula.codigo}</strong><small>{usefulLocation(room.aula.ubicacion) ?? `${room.aula.capacidad} puestos`}</small></th>{resumen.bloques.map((block) => { const item = block.aulas.find((candidate) => candidate.aula.id === room.aula.id); const state = item?.estadoCalculado ?? "disponible"; return <td key={block.horaInicio} title={item?.motivo}><span className={`${styles.dailyState} ${styles[`dailyState_${state}`] ?? ""}`}>{estadosCompactos[state] ?? state}</span></td>; })}</tr>)}</tbody></table></div> : <div className={styles.empty}>{resumen ? "No hay aulas para los filtros seleccionados." : "Cargando disponibilidad de la jornada…"}</div>}
    </section>
  </>;
}

function usefulLocation(value?: string) {
  const location = value?.trim();
  return !location || location.toLocaleLowerCase("es") === "sin ubicación registrada" ? null : location;
}

function formatDay(value?: string) {
  if (!value) return "Jornada seleccionada";
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
