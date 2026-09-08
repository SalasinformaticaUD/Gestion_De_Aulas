"use client";

import { useEffect, useMemo, useState } from "react";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { actualizarObservacion, crearObservacion, listarObservaciones } from "@/features/observaciones/api/observacionesApi";
import type { Room } from "@/features/aulas/types";
import type { OperationalObservation, ObservationType } from "@/features/observaciones/types";
import styles from "./ObservationsView.module.css";

type View = "vigentes" | "historial";

const typeLabels: Record<ObservationType, string> = { GENERAL: "General", NOVEDAD: "Novedad", RESTRICCION: "Restricción" };
const typeDescriptions: Record<ObservationType, string> = {
  GENERAL: "Información operativa sin vencimiento obligatorio.",
  NOVEDAD: "Situación detectada que debe quedar registrada.",
  RESTRICCION: "Bloquea la disponibilidad del aula mientras esté vigente.",
};

const isCurrent = (item: OperationalObservation) => !item.validUntil || new Date(item.validUntil) > new Date();

export function ObservationsView() {
  const [observations, setObservations] = useState<OperationalObservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [view, setView] = useState<View>("vigentes");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [editor, setEditor] = useState<OperationalObservation | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    try { const [nextRooms, nextObservations] = await Promise.all([listarAulas(), listarObservaciones()]); setRooms(nextRooms); setObservations(nextObservations); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cargar las observaciones."); }
  };
  useEffect(() => { void reload(); }, []);
  const current = observations.filter(isCurrent);
  const history = observations.filter((item) => !isCurrent(item));
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return (view === "vigentes" ? current : history).filter((item) =>
      (typeFilter === "todos" || item.type === typeFilter) &&
      (roomFilter === "todas" || item.roomId === roomFilter) &&
      (!normalized || `${item.folio} ${item.roomCode} ${item.content} ${typeLabels[item.type]}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [current, history, query, roomFilter, typeFilter, view]);

  const saveObservation = async (payload: Omit<OperationalObservation, "id" | "folio" | "createdAt">, item?: OperationalObservation) => {
    try { if (item) await actualizarObservacion(item.id, { aulaId: payload.roomId, tipo: payload.type, contenido: payload.content, vigenteDesde: payload.validFrom, vigenteHasta: payload.validUntil }); else await crearObservacion({ aulaId: payload.roomId, tipo: payload.type, contenido: payload.content, vigenteDesde: payload.validFrom, vigenteHasta: payload.validUntil }); await reload(); setView("vigentes"); setNotice(item ? "Observación actualizada correctamente." : `Observación registrada para el Aula ${payload.roomCode}.`); setEditor(null); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible guardar la observación."); }
  };

  const closeObservation = async (item: OperationalObservation) => {
    try { await actualizarObservacion(item.id, { aulaId: item.roomId, tipo: item.type, contenido: item.content, vigenteDesde: item.validFrom, vigenteHasta: new Date().toISOString() }); await reload(); setNotice(`${item.folio} fue cerrada y permanece en el historial.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cerrar la observación."); }
  };

  const changeView = (next: View) => { setView(next); setTypeFilter("todos"); };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Observaciones</h1><p>Novedades, seguimientos y restricciones registradas sobre las aulas.</p></div><button type="button" className="button-primary" onClick={() => setEditor("new")}>+ Nueva observación</button></section>

    <section className={styles.metrics} aria-label="Resumen de observaciones">
      <Metric label="Vigentes" value={current.length} detail="Con seguimiento activo" tone="blue" />
      <Metric label="Restricciones" value={current.filter((item) => item.type === "RESTRICCION").length} detail="Afectan disponibilidad" tone="red" />
      <Metric label="Novedades" value={current.filter((item) => item.type === "NOVEDAD").length} detail="Situaciones registradas" tone="amber" />
      <Metric label="Cerradas" value={history.length} detail="Conservadas en historial" tone="green" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <section className={styles.contentCard}>
      <header className={styles.cardHeader}><div className={styles.tabs} role="tablist" aria-label="Vigencia de observaciones"><button type="button" role="tab" aria-selected={view === "vigentes"} className={view === "vigentes" ? styles.activeTab : ""} onClick={() => changeView("vigentes")}>Vigentes <span>{current.length}</span></button><button type="button" role="tab" aria-selected={view === "historial"} className={view === "historial" ? styles.activeTab : ""} onClick={() => changeView("historial")}>Historial <span>{history.length}</span></button></div><div className={styles.context}><i />{view === "vigentes" ? "Seguimiento operativo actual" : "Registros cerrados o vencidos"}</div></header>
      <div className={styles.toolbar}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por contenido, aula o folio..." aria-label="Buscar observaciones" /></label><label><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="todos">Todos los tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Aula</span><select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="todas">Todas las aulas</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label><span className={styles.resultCount}>{visible.length} resultado(s)</span></div>
      <div className={styles.observationList}>{visible.map((item) => <ObservationCard key={item.id} item={item} current={isCurrent(item)} onEdit={() => setEditor(item)} onClose={() => closeObservation(item)} />)}{visible.length === 0 && <div className={styles.empty}>No hay observaciones para los filtros seleccionados.</div>}</div>
    </section>

    
    {editor && <ObservationDialog rooms={rooms} item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveObservation} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function ObservationCard({ item, current, onEdit, onClose }: { item: OperationalObservation; current: boolean; onEdit: () => void; onClose: () => void }) {
  return <article className={`${styles.observation} ${styles[`observation_${item.type.toLocaleLowerCase()}`]}`}><div className={styles.typeIcon} aria-hidden="true">{item.type === "RESTRICCION" ? "!" : item.type === "NOVEDAD" ? "N" : "i"}</div><div className={styles.observationBody}><header><div><TypeBadge type={item.type} /><span>{item.folio}</span></div><div className={styles.cardActions}><button type="button" onClick={onEdit}>Editar</button>{current && <button type="button" className={styles.closeButton} onClick={onClose}>Cerrar</button>}</div></header><p>{item.content}</p><footer><span><b>Aula {item.roomCode}</b></span><span>Registrada por <b>{item.author?.name ?? "Usuario no disponible"}</b></span><span>Creada {formatDateTime(item.createdAt)}</span>{item.type === "RESTRICCION" && item.validFrom && <span>Desde {formatDateTime(item.validFrom)}</span>}<span>{item.validUntil ? `${current ? "Hasta" : "Cerrada"} ${formatDateTime(item.validUntil)}` : "Sin fecha de cierre"}</span></footer></div></article>;
}

function TypeBadge({ type }: { type: ObservationType }) {
  return <strong className={`${styles.typeBadge} ${styles[`type_${type.toLocaleLowerCase()}`]}`}>{typeLabels[type]}</strong>;
}

function ObservationDialog({ rooms, item, onClose, onSave }: { rooms: Room[]; item?: OperationalObservation; onClose: () => void; onSave: (payload: Omit<OperationalObservation, "id" | "folio" | "createdAt">, item?: OperationalObservation) => void | Promise<void> }) {
  const [roomId, setRoomId] = useState(item?.roomId ?? rooms[0]?.id ?? "");
  const [type, setType] = useState<ObservationType>(item?.type ?? "GENERAL");
  const [content, setContent] = useState(item?.content ?? "");
  const [validFromDate, setValidFromDate] = useState(() => splitLocalDateTime(item?.validFrom).date);
  const [validFromTime, setValidFromTime] = useState(() => splitLocalDateTime(item?.validFrom).time);
  const [validUntilDate, setValidUntilDate] = useState(() => splitLocalDateTime(item?.validUntil).date);
  const [validUntilTime, setValidUntilTime] = useState(() => splitLocalDateTime(item?.validUntil).time);
  const selectedRoom = rooms.find((room) => room.id === roomId);
  if (!selectedRoom) return <div className={styles.backdrop} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true"><header><div><span>Registro operativo</span><h2>No hay aulas disponibles</h2><p>Primero cree un aula para registrar una observación.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cerrar</button></footer></section></div>;
  const validFrom = buildLocalDateTime(validFromDate, validFromTime);
  const validUntil = buildLocalDateTime(validUntilDate, validUntilTime);
  const invalidTime = (Boolean(validFromTime) && !isValidTime(validFromTime)) || (Boolean(validUntilTime) && !isValidTime(validUntilTime));
  const missingRestrictionRange = type === "RESTRICCION" && (!validFrom || !validUntil);
  const invalidDate = Boolean(validFrom && validUntil) && new Date(validUntil) <= new Date(validFrom);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (missingRestrictionRange || invalidDate || invalidTime) return; onSave({ roomId, roomCode: selectedRoom.code, type, content: content.trim(), validFrom: type === "RESTRICCION" && validFrom ? new Date(validFrom).toISOString() : null, validUntil: type === "RESTRICCION" && validUntil ? new Date(validUntil).toISOString() : null }, item); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="observation-dialog-title"><header><div><span>Registro operativo</span><h2 id="observation-dialog-title">{item ? "Editar observación" : "Nueva observación"}</h2><p>Clasifique la novedad y defina su vigencia sobre el aula.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}><label><span>Aula</span><select value={roomId} onChange={(event) => setRoomId(event.target.value)}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}</select></label><label><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as ObservationType)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={styles.wideField}><span>Contenido <small>{content.length}/2000</small></span><textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={1} maxLength={2000} rows={5} required autoFocus placeholder="Describa claramente la situación observada..." /></label>{type === "RESTRICCION" && <><DateTimeField label="Desde" date={validFromDate} time={validFromTime} onDateChange={setValidFromDate} onTimeChange={setValidFromTime} /><DateTimeField label="Hasta" date={validUntilDate} time={validUntilTime} onDateChange={setValidUntilDate} onTimeChange={setValidUntilTime} /></>}</div><div className={`${styles.typeHint} ${type === "RESTRICCION" ? styles.restrictionHint : ""}`}><strong>{typeLabels[type]}</strong><span>{typeDescriptions[type]}</span></div>{(missingRestrictionRange || invalidDate || invalidTime) && <div className={styles.inlineError}>{invalidTime ? "Escriba la hora en formato HH:mm, por ejemplo 14:30." : missingRestrictionRange ? "Una restricción debe definir las fechas desde y hasta." : "La fecha hasta debe ser posterior a la fecha desde."}</div>}<footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!content.trim() || missingRestrictionRange || invalidDate || invalidTime}>{item ? "Guardar cambios" : "Registrar observación"}</button></footer></form></section></div>;
}

function DateTimeField({ label, date, time, onDateChange, onTimeChange }: { label: string; date: string; time: string; onDateChange: (value: string) => void; onTimeChange: (value: string) => void }) {
  return <label><span>{label} <small>Obligatorio</small></span><div className={styles.dateTimeFields}><input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} required /><input type="text" value={time} onChange={(event) => onTimeChange(event.target.value.replace(/[^0-9:]/g, "").slice(0, 5))} inputMode="numeric" autoComplete="off" placeholder="HH:mm" aria-label={`Hora ${label.toLocaleLowerCase("es")}`} required /></div></label>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}

function splitLocalDateTime(value?: string | null) {
  if (!value) return { date: "", time: "" };
  const formatter = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" });
  const [date, time] = formatter.format(new Date(value)).split(" ");
  return { date, time };
}

function isValidTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function buildLocalDateTime(date: string, time: string) {
  return date && isValidTime(time) ? `${date}T${time}` : "";
}
