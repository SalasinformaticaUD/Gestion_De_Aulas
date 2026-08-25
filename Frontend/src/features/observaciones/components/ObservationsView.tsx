"use client";

import { useMemo, useState } from "react";
import { rooms } from "@/features/aulas/data/rooms";
import { initialObservations } from "@/features/observaciones/data/observations";
import type { OperationalObservation, ObservationType } from "@/features/observaciones/types";
import styles from "./ObservationsView.module.css";

type View = "vigentes" | "historial";

const referenceTime = new Date("2026-08-25T21:30:00-05:00");
const typeLabels: Record<ObservationType, string> = { GENERAL: "General", SEMANAL: "Semanal", NOVEDAD: "Novedad", RESTRICCION: "Restricción" };
const typeDescriptions: Record<ObservationType, string> = {
  GENERAL: "Información operativa sin vencimiento obligatorio.",
  SEMANAL: "Seguimiento temporal; exige una fecha de cierre.",
  NOVEDAD: "Situación detectada que debe quedar registrada.",
  RESTRICCION: "Bloquea la disponibilidad del aula mientras esté vigente.",
};

const isCurrent = (item: OperationalObservation) => new Date(item.createdAt) <= referenceTime && (!item.validUntil || new Date(item.validUntil) > referenceTime);

export function ObservationsView() {
  const [observations, setObservations] = useState(initialObservations);
  const [view, setView] = useState<View>("vigentes");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [editor, setEditor] = useState<OperationalObservation | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const saveObservation = (payload: Omit<OperationalObservation, "id" | "folio" | "createdAt">, item?: OperationalObservation) => {
    if (item) {
      setObservations((list) => list.map((currentItem) => currentItem.id === item.id ? { ...currentItem, ...payload } : currentItem));
      setNotice(`${item.folio} fue actualizada correctamente.`);
    } else {
      const nextNumber = Math.max(...observations.map((observation) => Number(observation.folio.slice(-4)))) + 1;
      const next: OperationalObservation = { ...payload, id: `50000000-0000-4000-8000-${String(nextNumber).padStart(12, "0")}`, folio: `OBS-2026-${String(nextNumber).padStart(4, "0")}`, createdAt: referenceTime.toISOString() };
      setObservations((list) => [next, ...list]);
      setView("vigentes");
      setNotice(`${next.folio} fue registrada para el Aula ${next.roomCode}.`);
    }
    setEditor(null);
  };

  const closeObservation = (item: OperationalObservation) => {
    setObservations((list) => list.map((currentItem) => currentItem.id === item.id ? { ...currentItem, validUntil: referenceTime.toISOString() } : currentItem));
    setNotice(`${item.folio} fue cerrada lógicamente; permanece disponible en el historial.`);
  };

  const changeView = (next: View) => { setView(next); setTypeFilter("todos"); };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Observaciones</h1><p>Novedades, seguimientos y restricciones registradas sobre las aulas.</p></div><button type="button" className="button-primary" onClick={() => setEditor("new")}>+ Nueva observación</button></section>

    <section className={styles.metrics} aria-label="Resumen de observaciones">
      <Metric label="Vigentes" value={current.length} detail="Con seguimiento activo" tone="blue" />
      <Metric label="Restricciones" value={current.filter((item) => item.type === "RESTRICCION").length} detail="Afectan disponibilidad" tone="red" />
      <Metric label="Semanales" value={current.filter((item) => item.type === "SEMANAL").length} detail="Con fecha de cierre" tone="amber" />
      <Metric label="Cerradas" value={history.length} detail="Conservadas en historial" tone="green" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <section className={styles.contentCard}>
      <header className={styles.cardHeader}><div className={styles.tabs} role="tablist" aria-label="Vigencia de observaciones"><button type="button" role="tab" aria-selected={view === "vigentes"} className={view === "vigentes" ? styles.activeTab : ""} onClick={() => changeView("vigentes")}>Vigentes <span>{current.length}</span></button><button type="button" role="tab" aria-selected={view === "historial"} className={view === "historial" ? styles.activeTab : ""} onClick={() => changeView("historial")}>Historial <span>{history.length}</span></button></div><div className={styles.context}><i />{view === "vigentes" ? "Seguimiento operativo actual" : "Registros cerrados o vencidos"}</div></header>
      <div className={styles.toolbar}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por contenido, aula o folio..." aria-label="Buscar observaciones" /></label><label><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="todos">Todos los tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Aula</span><select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="todas">Todas las aulas</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label><span className={styles.resultCount}>{visible.length} resultado(s)</span></div>
      <div className={styles.observationList}>{visible.map((item) => <ObservationCard key={item.id} item={item} current={isCurrent(item)} onEdit={() => setEditor(item)} onClose={() => closeObservation(item)} />)}{visible.length === 0 && <div className={styles.empty}>No hay observaciones para los filtros seleccionados.</div>}</div>
    </section>

    
    {editor && <ObservationDialog item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveObservation} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function ObservationCard({ item, current, onEdit, onClose }: { item: OperationalObservation; current: boolean; onEdit: () => void; onClose: () => void }) {
  const room = rooms.find((roomItem) => roomItem.id === item.roomId);
  return <article className={`${styles.observation} ${styles[`observation_${item.type.toLocaleLowerCase()}`]}`}><div className={styles.typeIcon} aria-hidden="true">{item.type === "RESTRICCION" ? "!" : item.type === "NOVEDAD" ? "N" : item.type === "SEMANAL" ? "S" : "i"}</div><div className={styles.observationBody}><header><div><TypeBadge type={item.type} /><span>{item.folio}</span></div><div className={styles.cardActions}><button type="button" onClick={onEdit}>Editar</button>{current && <button type="button" className={styles.closeButton} onClick={onClose}>Cerrar</button>}</div></header><p>{item.content}</p><footer><span><b>Aula {item.roomCode}</b> · {room?.location}</span><span>Creada {formatDateTime(item.createdAt)}</span><span>{item.validUntil ? `${current ? "Vigente hasta" : "Cerrada"} ${formatDateTime(item.validUntil)}` : "Sin fecha de cierre"}</span></footer></div></article>;
}

function TypeBadge({ type }: { type: ObservationType }) {
  return <strong className={`${styles.typeBadge} ${styles[`type_${type.toLocaleLowerCase()}`]}`}>{typeLabels[type]}</strong>;
}

function ObservationDialog({ item, onClose, onSave }: { item?: OperationalObservation; onClose: () => void; onSave: (payload: Omit<OperationalObservation, "id" | "folio" | "createdAt">, item?: OperationalObservation) => void }) {
  const [roomId, setRoomId] = useState(item?.roomId ?? rooms[0].id);
  const [type, setType] = useState<ObservationType>(item?.type ?? "GENERAL");
  const [content, setContent] = useState(item?.content ?? "");
  const [validUntil, setValidUntil] = useState(item?.validUntil ? toLocalInput(item.validUntil) : "");
  const selectedRoom = rooms.find((room) => room.id === roomId)!;
  const weeklyMissingDate = type === "SEMANAL" && !validUntil;
  const invalidDate = Boolean(validUntil) && new Date(validUntil) <= new Date(item?.createdAt ?? referenceTime);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (weeklyMissingDate || invalidDate) return; onSave({ roomId, roomCode: selectedRoom.code, type, content: content.trim(), validUntil: validUntil ? new Date(validUntil).toISOString() : null }, item); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="observation-dialog-title"><header><div><span>Registro operativo</span><h2 id="observation-dialog-title">{item ? "Editar observación" : "Nueva observación"}</h2><p>Clasifique la novedad y defina su vigencia sobre el aula.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}><label><span>Aula</span><select value={roomId} onChange={(event) => setRoomId(event.target.value)}>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code} · Piso {room.floor}</option>)}</select></label><label><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as ObservationType)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={styles.wideField}><span>Contenido <small>{content.length}/2000</small></span><textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={1} maxLength={2000} rows={5} required autoFocus placeholder="Describa claramente la situación observada..." /></label><label className={styles.wideField}><span>Vigente hasta <small>{type === "SEMANAL" ? "Obligatorio para observaciones semanales" : "Opcional"}</small></span><input type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} required={type === "SEMANAL"} /></label></div><div className={`${styles.typeHint} ${type === "RESTRICCION" ? styles.restrictionHint : ""}`}><strong>{typeLabels[type]}</strong><span>{typeDescriptions[type]}</span></div>{(weeklyMissingDate || invalidDate) && <div className={styles.inlineError}>{weeklyMissingDate ? "Una observación semanal debe definir una fecha de cierre." : "La fecha de vigencia debe ser posterior a la creación de la observación."}</div>}<footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!content.trim() || weeklyMissingDate || invalidDate}>{item ? "Guardar cambios" : "Registrar observación"}</button></footer></form></section></div>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}

function toLocalInput(value: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" });
  return formatter.format(new Date(value)).replace(" ", "T");
}
