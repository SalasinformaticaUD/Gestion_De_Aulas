"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  availabilityRooms,
  characteristicOptions,
  getAvailabilityForBlock,
  getDailyAvailability,
  getDerivedHistory,
  getEndTime,
  operatingBlocks,
} from "@/features/disponibilidad/data/availability";
import type {
  AvailabilityHistoryEvent,
  AvailabilityResult,
  AvailabilitySourceType,
  AvailabilityState,
} from "@/features/disponibilidad/types";
import styles from "./AvailabilityView.module.css";

type View = "bloque" | "dia" | "historial";
type StateFilter = "todos" | AvailabilityState;

const stateLabels: Record<AvailabilityState, string> = {
  disponible: "Disponible",
  ocupada: "Ocupada",
  reservada: "Reservada",
  mantenimiento: "Mantenimiento",
  bloqueada: "Bloqueada",
};

const stateDescriptions: Record<AvailabilityState, string> = {
  disponible: "Lista para usar",
  ocupada: "En uso actualmente",
  reservada: "Con reserva activa",
  mantenimiento: "Fuera de servicio",
  bloqueada: "Acceso restringido",
};

const sourceLabels: Record<AvailabilitySourceType, string> = {
  "estado-aula": "Estado del aula",
  restriccion: "Restricción",
  "clase-programada": "Clase programada",
  "prestamo-docente": "Préstamo docente",
  "practica-libre": "Práctica libre",
  "tarea-operativa": "Tarea operativa",
};

const softwareOptions = [...new Map(availabilityRooms.flatMap((room) => room.software).map((software) => [software.id, software])).values()]
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

export function AvailabilityView() {
  const [view, setView] = useState<View>("bloque");
  const [date, setDate] = useState("2026-08-25");
  const [startTime, setStartTime] = useState("08:00");
  const [stateFilter, setStateFilter] = useState<StateFilter>("todos");
  const [floor, setFloor] = useState("todos");
  const [query, setQuery] = useState("");
  const [capacity, setCapacity] = useState("");
  const [softwareId, setSoftwareId] = useState("");
  const [characteristics, setCharacteristics] = useState<string[]>([]);
  const [suggestionsOnly, setSuggestionsOnly] = useState(false);
  const [selected, setSelected] = useState<AvailabilityResult | null>(null);
  const [historyRoom, setHistoryRoom] = useState("401");
  const [historyFrom, setHistoryFrom] = useState("2026-08-19");
  const [historyTo, setHistoryTo] = useState("2026-08-25");

  const allResults = useMemo(
    () => availabilityRooms.map((room) => getAvailabilityForBlock(room, date, startTime)),
    [date, startTime],
  );

  const baseResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const minimumCapacity = Number(capacity) || 0;
    return allResults.filter(({ room }) =>
      (floor === "todos" || room.floor === Number(floor)) &&
      room.capacity >= minimumCapacity &&
      (!softwareId || room.software.some((software) => software.id === softwareId)) &&
      characteristics.every((characteristic) => room.characteristics.includes(characteristic)) &&
      (!normalized || `${room.code} ${room.location} ${room.software.map((item) => item.name).join(" ")}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [allResults, capacity, characteristics, floor, query, softwareId]);

  const filteredResults = useMemo(() => {
    const visible = baseResults.filter((result) =>
      (stateFilter === "todos" || result.calculatedState === stateFilter) &&
      (!suggestionsOnly || result.calculatedState === "disponible"),
    );
    return suggestionsOnly
      ? [...visible].sort((a, b) => (a.room.capacity - (Number(capacity) || 0)) - (b.room.capacity - (Number(capacity) || 0)) || a.room.code.localeCompare(b.room.code))
      : visible;
  }, [baseResults, capacity, stateFilter, suggestionsOnly]);

  const groupedResults = useMemo(() => {
    const groups = new Map<number, AvailabilityResult[]>();
    filteredResults.forEach((result) => groups.set(result.room.floor, [...(groups.get(result.room.floor) ?? []), result]));
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [filteredResults]);

  const history = useMemo(() => getDerivedHistory(historyRoom, historyFrom, historyTo), [historyFrom, historyRoom, historyTo]);
  const daily = useMemo(() => getDailyAvailability(date), [date]);
  const floors = [...new Set(availabilityRooms.map((room) => room.floor))].sort();
  const count = (state: AvailabilityState) => baseResults.filter((result) => result.calculatedState === state).length;
  const toggleCharacteristic = (item: string) => setCharacteristics((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  const clearFilters = () => { setStateFilter("todos"); setFloor("todos"); setQuery(""); setCapacity(""); setSoftwareId(""); setCharacteristics([]); setSuggestionsOnly(false); };

  return <>
    <section className={`page-heading ${styles.heading}`}>
      <div><h1>Disponibilidad de Aulas</h1><p>Estado operativo por bloques de dos horas, sin persistir resultados.</p></div>
      <div className={styles.calculated}><i />Actualizado para {formatDate(date)} · {startTime}–{getEndTime(startTime)}</div>
    </section>

    <nav className={styles.viewTabs} aria-label="Vistas de disponibilidad">
      <button type="button" className={view === "bloque" ? styles.active : ""} onClick={() => setView("bloque")}><span aria-hidden="true">▦</span> Estado por bloque</button>
      <button type="button" className={view === "dia" ? styles.active : ""} onClick={() => setView("dia")}><span aria-hidden="true">≡</span> Resumen del día</button>
      <button type="button" className={view === "historial" ? styles.active : ""} onClick={() => setView("historial")}><span aria-hidden="true">↺</span> Histórico derivado</button>
    </nav>

    {view !== "historial" && <section className={styles.timePanel}>
      <label className={styles.control}><span>Fecha de consulta</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <div className={styles.blockControl}><span>Bloque operativo</span><div className={styles.blockScroller}>{operatingBlocks.map((block) => <button key={block} type="button" className={startTime === block ? styles.selectedBlock : ""} onClick={() => setStartTime(block)}>{block}<small>{getEndTime(block)}</small></button>)}</div></div>
     
    </section>}

    {view === "bloque" && <>
      <section className={styles.statusBar} aria-label="Filtrar por estado calculado">
        {(Object.keys(stateLabels) as AvailabilityState[]).map((state) => <button key={state} type="button" className={`${styles.statusMetric} ${styles[`statusMetric_${state}`]} ${stateFilter === state ? styles.statusActive : ""}`} onClick={() => setStateFilter((current) => current === state ? "todos" : state)}><div><span>{stateLabels[state]}</span><strong>{count(state)}</strong><small>{stateDescriptions[state]}</small></div><i aria-hidden="true" /></button>)}
      </section>

      <section className={styles.filters} aria-label="Filtros de disponibilidad">
        <label className={`${styles.control} ${styles.searchControl}`}><span>Buscar aula o software</span><div><i aria-hidden="true">⌕</i><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. 402, Python, Piso 5..." /></div></label>
        <label className={styles.control}><span>Piso</span><select value={floor} onChange={(event) => setFloor(event.target.value)}><option value="todos">Todos</option>{floors.map((item) => <option key={item} value={item}>Piso {item}</option>)}</select></label>
        <label className={styles.control}><span>Capacidad mínima</span><input type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Sin mínimo" /></label>
        <label className={styles.control}><span>Software requerido</span><select value={softwareId} onChange={(event) => setSoftwareId(event.target.value)}><option value="">Cualquier software</option>{softwareOptions.map((software) => <option key={software.id} value={software.id}>{software.name}</option>)}</select></label>
        <button type="button" className={styles.clearButton} onClick={clearFilters}>Limpiar</button>
        <div className={styles.characteristics}><span>Características</span><div>{characteristicOptions.map((item) => <button key={item} type="button" className={characteristics.includes(item) ? styles.selectedFeature : ""} onClick={() => toggleCharacteristic(item)}>{item}</button>)}</div></div>
        <label className={styles.suggestionToggle}><input type="checkbox" checked={suggestionsOnly} onChange={(event) => setSuggestionsOnly(event.target.checked)} /><span><b>Mostrar solo sugerencias</b><small>Ordenadas por capacidad sobrante y código</small></span></label>
      </section>

      <div className={styles.resultsMeta}><span><strong>{filteredResults.length}</strong> de {availabilityRooms.length} aulas</span><span>Prioridad: estado físico → restricción → clase → préstamo → práctica → tarea</span></div>

      {groupedResults.map(([level, results]) => <section key={level} className={styles.floorGroup}>
        <header><span>{level}</span><div><h2>Piso {level}</h2><p>{results.length} aula{results.length === 1 ? "" : "s"} para los filtros seleccionados</p></div></header>
        <div className={styles.roomGrid}>{results.map((result) => <AvailabilityCard key={result.room.id} result={result} onDetail={() => setSelected(result)} />)}</div>
      </section>)}
      {filteredResults.length === 0 && <section className={styles.empty}><span>⌕</span><h2>No encontramos aulas</h2><p>Prueba otro bloque o elimina uno de los filtros aplicados.</p><button type="button" onClick={clearFilters}>Limpiar filtros</button></section>}
    </>}

    {view === "dia" && <DailySummary daily={daily} query={query} floor={floor} onSelect={setSelected} floors={floors} setQuery={setQuery} setFloor={setFloor} />}
    {view === "historial" && <HistoryView room={historyRoom} from={historyFrom} to={historyTo} events={history} onRoom={setHistoryRoom} onFrom={setHistoryFrom} onTo={setHistoryTo} />}
    {selected && <AvailabilityDialog result={selected} onClose={() => setSelected(null)} />}
  </>;
}

function AvailabilityCard({ result, onDetail }: { result: AvailabilityResult; onDetail: () => void }) {
  const { room } = result;
  return <article className={`${styles.roomCard} ${styles[`border_${result.calculatedState}`]}`}>
    <header><div className={styles.roomIdentity}><span>{room.code}</span><div><h3>Aula {room.code}</h3><p>{room.capacity} puestos · Piso {room.floor}</p></div></div><StateBadge state={result.calculatedState} /></header>
    <div className={styles.activity}><span>{result.currentBlock ? sourceLabels[result.currentBlock.type] : "Bloque actual"}</span><strong>{result.currentBlock?.description ?? "Sin actividades ni restricciones"}</strong><p>{result.reason}</p></div>
    <div className={styles.nextActivity}><span>Próxima actividad</span>{result.nextActivity ? <p><b>{result.nextActivity.startTime}</b>{result.nextActivity.description}</p> : <p className={styles.noActivity}>Sin actividad posterior registrada</p>}</div>
    <div className={styles.software}><span>Software instalado</span><div>{room.software.slice(0, 3).map((software) => <i key={software.id}>{software.name}</i>)}{room.software.length > 3 && <i>+{room.software.length - 3}</i>}</div></div>
    <footer><button type="button" onClick={onDetail}>Ver cálculo</button><Link href="/aulas">Ver aula <span aria-hidden="true">→</span></Link></footer>
  </article>;
}

function StateBadge({ state, compact = false }: { state: AvailabilityState; compact?: boolean }) {
  return <span className={`${styles.stateBadge} ${styles[`tone_${state}`]} ${compact ? styles.compactBadge : ""}`}><i />{compact ? stateLabels[state].slice(0, 3) : stateLabels[state]}</span>;
}

function DailySummary({ daily, query, floor, floors, setQuery, setFloor, onSelect }: { daily: ReturnType<typeof getDailyAvailability>; query: string; floor: string; floors: number[]; setQuery: (value: string) => void; setFloor: (value: string) => void; onSelect: (result: AvailabilityResult) => void }) {
  const normalized = query.trim().toLocaleLowerCase("es");
  const visibleRooms = availabilityRooms.filter((room) => (floor === "todos" || room.floor === Number(floor)) && (!normalized || `${room.code} ${room.location}`.toLocaleLowerCase("es").includes(normalized)));
  return <>
    <section className={styles.summaryTools}><label className={`${styles.control} ${styles.searchControl}`}><span>Buscar aula</span><div><i aria-hidden="true">⌕</i><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código o ubicación" /></div></label><label className={styles.control}><span>Piso</span><select value={floor} onChange={(event) => setFloor(event.target.value)}><option value="todos">Todos</option>{floors.map((item) => <option key={item} value={item}>Piso {item}</option>)}</select></label><div className={styles.legend}>{(Object.keys(stateLabels) as AvailabilityState[]).map((state) => <span key={state} className={styles[`tone_${state}`]}><i />{stateLabels[state]}</span>)}</div></section>
    <section className={styles.dailyCard}><header><div><h2>Resumen diario</h2><p>Rango operativo 06:00–22:00 · bloques de dos horas</p></div><span>Calculado · no persistido</span></header><div className="table-wrap"><table className={styles.dailyTable}><thead><tr><th>Aula</th>{daily.map((block) => <th key={block.startTime}>{block.startTime}<small>{block.endTime}</small></th>)}</tr></thead><tbody>{visibleRooms.map((room) => <tr key={room.id}><th><strong>{room.code}</strong><small>Piso {room.floor} · {room.capacity} puestos</small></th>{daily.map((block) => { const result = block.rooms.find((item) => item.room.id === room.id)!; return <td key={block.startTime}><button type="button" title={`${stateLabels[result.calculatedState]}: ${result.reason}`} onClick={() => onSelect(result)}><StateBadge state={result.calculatedState} compact /></button></td>; })}</tr>)}</tbody></table></div></section>
  </>;
}

function HistoryView({ room, from, to, events, onRoom, onFrom, onTo }: { room: string; from: string; to: string; events: AvailabilityHistoryEvent[]; onRoom: (value: string) => void; onFrom: (value: string) => void; onTo: (value: string) => void }) {
  return <div className={styles.historyLayout}><aside className={styles.historyFilters}><h2>Consulta histórica</h2><p>Derivada de las fuentes operativas. Rango máximo del backend: 31 días.</p><label className={styles.control}><span>Aula</span><select value={room} onChange={(event) => onRoom(event.target.value)}>{availabilityRooms.map((item) => <option key={item.id} value={item.code}>Aula {item.code} · Piso {item.floor}</option>)}</select></label><div className={styles.historyDates}><label className={styles.control}><span>Desde</span><input type="date" value={from} onChange={(event) => onFrom(event.target.value)} /></label><label className={styles.control}><span>Hasta</span><input type="date" value={to} onChange={(event) => onTo(event.target.value)} /></label></div><div className={styles.derivedNote}><i>i</i><p><strong>Histórico derivado</strong>No existe una tabla de disponibilidad. Los eventos se reconstruyen desde sus fuentes.</p></div></aside><section className={styles.timelineCard}><header><div><h2>Actividad del Aula {room}</h2><p>{formatDate(from)}–{formatDate(to)}</p></div><span>{events.length} evento{events.length === 1 ? "" : "s"}</span></header>{events.length ? <div className={styles.timeline}>{events.map((event) => <article key={event.id}><i className={styles[`source_${event.type.replaceAll("-", "_")}`]} /><time>{formatEventDate(event.start)}<small>{formatEventTime(event.start)}–{event.end ? formatEventTime(event.end) : "Sin fin"}</small></time><div><span>{sourceLabels[event.type]}</span><strong>{event.description}</strong>{event.status && <small>Estado: {event.status}</small>}</div></article>)}</div> : <div className={styles.historyEmpty}><span>↺</span><h3>Sin eventos en el rango</h3><p>La disponibilidad se reconstruye únicamente cuando existen fuentes operativas.</p></div>}<footer><span>derivado: <b>true</b></span><span>persistido: <b>false</b></span></footer></section></div>;
}

function AvailabilityDialog({ result, onClose }: { result: AvailabilityResult; onClose: () => void }) {
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="availability-detail-title"><header><div><span>Aula {result.room.code} · {result.block.startTime}–{result.block.endTime}</span><h2 id="availability-detail-title">Detalle del cálculo</h2></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><div className={styles.dialogBody}><div className={styles.dialogStatus}><StateBadge state={result.calculatedState} /><p>{result.reason}</p></div><dl><div><dt>Fecha</dt><dd>{formatDate(result.block.date)}</dd></div><div><dt>Duración</dt><dd>{result.block.durationHours} horas</dd></div><div><dt>Capacidad</dt><dd>{result.room.capacity} puestos</dd></div><div><dt>Ubicación</dt><dd>{result.room.location}</dd></div></dl><section><h3>Fuentes encontradas</h3>{result.sources.length ? <div className={styles.sourceList}>{result.sources.map((source) => <article key={source.id}><i className={styles[`source_${source.type.replaceAll("-", "_")}`]} /><div><span>{sourceLabels[source.type]}{source.status && <b>{source.status}</b>}</span><p>{source.description}</p></div></article>)}</div> : <p className={styles.noSources}>No existen fuentes que bloqueen o reserven el aula durante este bloque.</p>}</section>{result.nextActivity && <section className={styles.dialogNext}><h3>Siguiente actividad</h3><p><time>{result.nextActivity.startTime}–{result.nextActivity.endTime}</time><span>{sourceLabels[result.nextActivity.type]}</span><strong>{result.nextActivity.description}</strong></p></section>}<div className={styles.calculationMeta}><span>Calculado en zona horaria America/Bogota</span><span>persistido: <b>false</b></span></div></div><footer><button type="button" onClick={onClose}>Cerrar</button><Link href="/aulas">Abrir ficha del aula</Link></footer></section></div>;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(new Date(value));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}