"use client";

import { useEffect, useMemo, useState } from "react";
import { consultarDisponibilidad, type DisponibilidadApi } from "@/features/disponibilidad/api/disponibilidadApi";
import styles from "./AvailabilityView.module.css";

const estados: Record<string, string> = { disponible: "Disponible", ocupada: "Ocupada", reservada: "Reservada", mantenimiento: "Mantenimiento", bloqueada: "Bloqueada" };
const bloques = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

export function AvailabilityView() {
  const [fecha, setFecha] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()));
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [resultados, setResultados] = useState<DisponibilidadApi[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState<string | null>(null);
  const horaFin = `${String(Number(horaInicio.slice(0, 2)) + 2).padStart(2, "0")}:00`;
  const cargar = async () => { try { setError(null); setResultados(await consultarDisponibilidad(fecha, horaInicio, horaFin)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible consultar disponibilidad."); } };
  // La consulta depende únicamente del bloque seleccionado; cargar se recrea al renderizar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargar(); }, [fecha, horaInicio]);
  const visibles = useMemo(() => resultados.filter((item) => filtro === "todos" || item.estadoCalculado === filtro), [filtro, resultados]);
  return <><section className={`page-heading ${styles.heading}`}><div><h1>Disponibilidad de Aulas</h1><p>Resultado calculado directamente desde las fuentes operativas del backend.</p></div><div className={styles.calculated}>Actualizado · {fecha} · {horaInicio}–{horaFin}</div></section><section className={styles.timePanel}><label className={styles.control}><span>Fecha</span><input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label><label className={styles.control}><span>Bloque</span><select value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)}>{bloques.map((bloque) => <option key={bloque} value={bloque}>{bloque}–{String(Number(bloque.slice(0, 2)) + 2).padStart(2, "0")}:00</option>)}</select></label><button type="button" onClick={() => void cargar()}>Actualizar</button></section>{error && <p className={styles.empty}>{error}</p>}<section className={styles.statusBar}>{["todos", ...Object.keys(estados)].map((estado) => <button key={estado} type="button" className={filtro === estado ? styles.statusActive : ""} onClick={() => setFiltro(estado)}>{estado === "todos" ? "Todas" : estados[estado]} <strong>{estado === "todos" ? resultados.length : resultados.filter((item) => item.estadoCalculado === estado).length}</strong></button>)}</section><section className={styles.floorGroup}><div className={styles.roomGrid}>{visibles.map((item) => <article key={item.aula.id} className={styles.roomCard}><header><div className={styles.roomIdentity}><span>{item.aula.codigo}</span><div><h3>Aula {item.aula.codigo}</h3><p>{item.aula.capacidad} puestos · Piso {item.aula.piso ?? "—"}</p></div></div><b>{estados[item.estadoCalculado] ?? item.estadoCalculado}</b></header><div className={styles.activity}><span>{item.aula.ubicacion}</span><strong>{item.motivo}</strong><p>{item.fuentes.map((fuente) => `${fuente.tipo}: ${fuente.descripcion}`).join(" · ") || "Sin fuentes que bloqueen el aula."}</p></div></article>)}</div>{!visibles.length && <div className={styles.empty}>No hay aulas para la consulta seleccionada.</div>}</section></>;
}
