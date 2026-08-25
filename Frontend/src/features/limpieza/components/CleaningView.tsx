"use client";

import { useMemo, useState } from "react";
import { rooms } from "@/features/aulas/data/rooms";
import { initialCleaningRecords } from "@/features/limpieza/data/cleaning";
import type { CleaningRecord } from "@/features/limpieza/types";
import styles from "./CleaningView.module.css";

type View = "registros" | "cobertura";
const today = "2026-08-25";

export function CleaningView() {
  const [records, setRecords] = useState(initialCleaningRecords);
  const [view, setView] = useState<View>("registros");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [from, setFrom] = useState("2026-08-19");
  const [to, setTo] = useState(today);
  const [editor, setEditor] = useState<CleaningRecord | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const todayRecords = records.filter((record) => record.performedAt.slice(0, 10) === today);
  const visibleRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return records.filter((record) =>
      (roomFilter === "todas" || record.roomId === roomFilter) &&
      (!from || record.performedAt.slice(0, 10) >= from) &&
      (!to || record.performedAt.slice(0, 10) <= to) &&
      (!normalized || `${record.folio} ${record.roomCode} ${record.observation ?? ""}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [from, query, records, roomFilter, to]);

  const saveRecord = (payload: Omit<CleaningRecord, "id" | "folio">, item?: CleaningRecord) => {
    if (item) {
      setRecords((current) => current.map((record) => record.id === item.id ? { ...record, ...payload } : record));
      setNotice(`${item.folio} fue actualizado correctamente.`);
    } else {
      const nextNumber = Math.max(...records.map((record) => Number(record.folio.slice(-4)))) + 1;
      const record: CleaningRecord = { ...payload, id: `70000000-0000-4000-8000-${String(nextNumber).padStart(12, "0")}`, folio: `LIM-2026-${String(nextNumber).padStart(4, "0")}` };
      setRecords((current) => [record, ...current]);
      setNotice(`${record.folio} registrado para el Aula ${record.roomCode}.`);
    }
    setEditor(null);
  };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Limpieza de Aulas</h1><p>Registro y consulta de las limpiezas realizadas en las aulas de software.</p></div><button type="button" className="button-primary" onClick={() => setEditor("new")}>+ Registrar limpieza</button></section>

    <section className={styles.metrics} aria-label="Resumen de limpieza">
      <Metric label="Registros de hoy" value={todayRecords.length} detail="Limpiezas realizadas" tone="green" />
      <Metric label="Aulas atendidas" value={new Set(todayRecords.map((record) => record.roomId)).size} detail={`de ${rooms.length} aulas registradas`} tone="blue" />
      <Metric label="Últimos 7 días" value={records.filter((record) => record.performedAt.slice(0, 10) >= "2026-08-19").length} detail="Registros en el periodo" tone="violet" />
      <Metric label="Con observación" value={records.filter((record) => record.observation?.trim()).length} detail="Novedades documentadas" tone="amber" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <div className={styles.viewTabs} role="tablist" aria-label="Vistas de limpieza"><button type="button" role="tab" aria-selected={view === "registros"} className={view === "registros" ? styles.activeTab : ""} onClick={() => setView("registros")}>Historial de registros <span>{records.length}</span></button><button type="button" role="tab" aria-selected={view === "cobertura"} className={view === "cobertura" ? styles.activeTab : ""} onClick={() => setView("cobertura")}>Cobertura de hoy <span>{new Set(todayRecords.map((record) => record.roomId)).size}</span></button></div>

    {view === "registros" ? <section className={styles.contentCard}><div className={styles.toolbar}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por aula, folio u observación..." aria-label="Buscar registros de limpieza" /></label><label><span>Aula</span><select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="todas">Todas las aulas</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label><label><span>Desde</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>Hasta</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><span className={styles.resultCount}>{visibleRecords.length} resultado(s)</span></div><div className="table-wrap"><table className={styles.cleaningTable}><thead><tr><th>Registro</th><th>Aula</th><th>Fecha de realización</th><th>Ubicación</th><th>Observación</th><th>Acciones</th></tr></thead><tbody>{visibleRecords.map((record) => <CleaningRow key={record.id} record={record} onEdit={() => setEditor(record)} />)}{visibleRecords.length === 0 && <tr><td colSpan={6} className={styles.emptyTable}>No hay registros para los filtros seleccionados.</td></tr>}</tbody></table></div></section> : <CoverageView records={todayRecords} onRegister={() => setEditor("new")} />}

    
    {editor && <CleaningDialog item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveRecord} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function CleaningRow({ record, onEdit }: { record: CleaningRecord; onEdit: () => void }) {
  const room = rooms.find((item) => item.id === record.roomId);
  return <tr><td><strong className={styles.folio}>{record.folio}</strong><small>{record.id.slice(0, 13)}…</small></td><td><b className={styles.roomCode}>{record.roomCode}</b></td><td><time>{formatDateTime(record.performedAt)}</time><small>{getDayPeriod(record.performedAt)}</small></td><td><span>{room?.location}</span><small>{room?.capacity} puestos</small></td><td>{record.observation ? <span className={styles.observation}>{record.observation}</span> : <span className={styles.noObservation}>Sin observación</span>}</td><td><button type="button" className={styles.editButton} onClick={onEdit}>Editar registro</button></td></tr>;
}

function CoverageView({ records, onRegister }: { records: CleaningRecord[]; onRegister: () => void }) {
  const floors = [...new Set(rooms.map((room) => room.floor))].sort();
  return <section className={styles.coverageCard}><header><div><h2>Cobertura registrada para hoy</h2><p>Estado derivado de los registros con fecha {new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${today}T12:00:00-05:00`))}.</p></div><span>{new Set(records.map((record) => record.roomId)).size} de {rooms.length} aulas</span></header><div className={styles.floorGroups}>{floors.map((floor) => <section key={floor}><h3>Piso {floor}</h3><div>{rooms.filter((room) => room.floor === floor).map((room) => {
    const roomRecords = records.filter((record) => record.roomId === room.id);
    const latest = roomRecords.sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0];
    return <article key={room.id} className={latest ? styles.coveredRoom : ""}><header><strong>{room.code}</strong><span>{latest ? "Con registro" : "Sin registro hoy"}</span></header>{latest ? <><time>{formatTime(latest.performedAt)}</time><small>{latest.observation ? "Con observación" : "Sin novedades"}</small></> : <button type="button" onClick={onRegister}>Registrar</button>}</article>;
  })}</div></section>)}</div></section>;
}

function CleaningDialog({ item, onClose, onSave }: { item?: CleaningRecord; onClose: () => void; onSave: (payload: Omit<CleaningRecord, "id" | "folio">, item?: CleaningRecord) => void }) {
  const [roomId, setRoomId] = useState(item?.roomId ?? rooms[0].id);
  const [performedAt, setPerformedAt] = useState(item ? toLocalInput(item.performedAt) : "2026-08-25T21:30");
  const [observation, setObservation] = useState(item?.observation ?? "");
  const room = rooms.find((current) => current.id === roomId)!;
  const submit = (event: React.FormEvent) => { event.preventDefault(); onSave({ roomId, roomCode: room.code, performedAt: new Date(performedAt).toISOString(), observation: observation.trim() || undefined }, item); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="cleaning-dialog-title"><header><div><span>Registro operativo</span><h2 id="cleaning-dialog-title">{item ? "Editar limpieza" : "Registrar limpieza"}</h2><p>Consigne cuándo se realizó y cualquier novedad encontrada.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}><label><span>Aula</span><select value={roomId} onChange={(event) => setRoomId(event.target.value)}>{rooms.map((current) => <option key={current.id} value={current.id}>Aula {current.code} · Piso {current.floor}</option>)}</select></label><label><span>Realizada en</span><input type="datetime-local" value={performedAt} onChange={(event) => setPerformedAt(event.target.value)} required /></label><label className={styles.wideField}><span>Observación <small>Opcional</small></span><textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows={5} placeholder="Describa novedades, elementos faltantes o condiciones encontradas..." /></label></div><div className={styles.formSummary}><span>Aula <strong>{room.code}</strong></span><span>{room.location}</span><span>{room.capacity} puestos</span></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!performedAt}>{item ? "Guardar cambios" : "Registrar limpieza"}</button></footer></form></section></div>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}
function getDayPeriod(value: string) {
  const hour = Number(new Intl.DateTimeFormat("es-CO", { hour: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value)));
  return hour < 12 ? "Jornada de la mañana" : hour < 18 ? "Jornada de la tarde" : "Jornada de la noche";
}
function toLocalInput(value: string) {
  return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value)).replace(" ", "T");
}
