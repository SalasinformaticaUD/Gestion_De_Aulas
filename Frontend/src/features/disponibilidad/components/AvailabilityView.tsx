"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { consultarDisponibilidad, type DisponibilidadApi } from "@/features/disponibilidad/api/disponibilidadApi";
import styles from "./AvailabilityView.module.css";

const estados: Record<string, string> = { disponible: "Disponible", ocupada: "En clase", reservada: "Reservada", mantenimiento: "Mantenimiento", bloqueada: "Bloqueada" };
const estadosAsistencia: Record<string, string> = { ASISTIO: "Asistió", AUSENTE: "No asistió", PENDIENTE: "Pendiente" };
const bloques = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

function bloqueActualBogota() {
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const inicio = Math.min(20, Math.max(6, 6 + Math.floor((hora - 6) / 2) * 2));
  return `${String(inicio).padStart(2, "0")}:00`;
}

export function AvailabilityView() {
  const [fecha, setFecha] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()));
  const [horaInicio, setHoraInicio] = useState(bloqueActualBogota);
  const [resultados, setResultados] = useState<DisponibilidadApi[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const horaFin = `${String(Number(horaInicio.slice(0, 2)) + 2).padStart(2, "0")}:00`;
  const cargar = useCallback(async () => { try { setActualizando(true); setError(null); setResultados(await consultarDisponibilidad(fecha, horaInicio, horaFin)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible consultar disponibilidad."); } finally { setActualizando(false); } }, [fecha, horaInicio, horaFin]);
  useEffect(() => {
    void cargar();
    const timer = window.setInterval(() => void cargar(), 60000);
    return () => window.clearInterval(timer);
  }, [cargar]);
  const visibles = useMemo(() => resultados.filter((item) => filtro === "todos" || item.estadoCalculado === filtro), [filtro, resultados]);
  return <><section className={`page-heading ${styles.heading}`}><div><h1>Disponibilidad de Aulas</h1><p>Estado calculado con clases, asistencia, reservas y restricciones operativas.</p></div><div className={styles.calculated}>Actualizado · {fecha} · {horaInicio}–{horaFin}</div></section><section className={styles.timePanel}><label className={styles.control}><span>Fecha</span><input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label><label className={styles.control}><span>Bloque</span><select value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)}>{bloques.map((bloque) => <option key={bloque} value={bloque}>{bloque}–{String(Number(bloque.slice(0, 2)) + 2).padStart(2, "0")}:00</option>)}</select></label><button type="button" className={styles.refreshButton} onClick={() => void cargar()} disabled={actualizando}>{actualizando ? "Actualizando…" : "Actualizar"}</button></section>{error && <p className={styles.empty}>{error}</p>}<section className={styles.statusBar}>{["todos", ...Object.keys(estados)].map((estado) => { const cantidad = estado === "todos" ? resultados.length : resultados.filter((item) => item.estadoCalculado === estado).length; return <button key={estado} type="button" className={`${styles.statusMetric} ${styles[`statusMetric_${estado}`] ?? ""} ${filtro === estado ? styles.statusActive : ""}`} onClick={() => setFiltro(estado)}><div><span>{estado === "todos" ? "Todas las aulas" : estados[estado]}</span><strong>{cantidad}</strong><small>{estado === "todos" ? "Total consultado" : `Aulas ${estados[estado].toLowerCase()}`}</small></div><i aria-hidden="true" /></button>; })}</section><section className={styles.floorGroup}><div className={styles.roomGrid}>{visibles.map((item) => { const fuenteClase = item.fuentes.find((fuente) => fuente.tipo === "clase-programada"); const asistencia = fuenteClase?.estado; const estado = item.estadoCalculado; return <article key={item.aula.id} className={`${styles.roomCard} ${styles[`border_${estado}`] ?? ""}`}><header><div className={styles.roomIdentity}><span>{item.aula.codigo}</span><div><h3>Aula {item.aula.codigo}</h3><p>{item.aula.capacidad} puestos </p></div></div><b className={`${styles.stateBadge} ${styles[`tone_${estado}`] ?? ""}`}><i aria-hidden="true" />{estados[estado] ?? estado}</b></header><div className={styles.activity}><span>{item.aula.ubicacion}</span><strong>{item.motivo}</strong>{asistencia && <em className={`${styles.attendanceBadge} ${styles[`attendance_${asistencia}`] ?? ""}`}>Asistencia: {estadosAsistencia[asistencia] ?? asistencia}</em>}<p>{item.fuentes.map((fuente) => `${fuente.tipo}: ${fuente.descripcion}`).join(" · ") || "Sin fuentes que bloqueen el aula."}</p></div></article>; })}</div>{!visibles.length && <div className={styles.empty}>No hay aulas para la consulta seleccionada.</div>}</section></>;
}
