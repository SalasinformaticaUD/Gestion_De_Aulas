"use client";

import { useEffect, useState } from "react";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { actualizarLimpieza, consultarMatrizLimpieza, consultarSugerenciasLimpieza, crearLimpieza, listarLimpiezas, type CleaningMatrix, type CleaningSuggestion } from "@/features/limpieza/api/limpiezaApi";
import type { Room } from "@/features/aulas/types";
import type { CleaningRecord } from "@/features/limpieza/types";
import styles from "./CleaningView.module.css";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

export function CleaningView() {
  const [records, setRecords] = useState<CleaningRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editor, setEditor] = useState<CleaningRecord | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<CleaningMatrix | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixMonth, setMatrixMonth] = useState(today.slice(0, 7));
  const [matrixStatus, setMatrixStatus] = useState<"todas" | "realizado" | "sin-registro" | "novedad">("todas");
  const [matrixCell, setMatrixCell] = useState<{ roomId: string; date: string } | null>(null);
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [registrationMode, setRegistrationMode] = useState(false);

  const todayRecords = records.filter((record) => record.performedAt.slice(0, 10) === today);

  const reload = async () => { try { const [nextRooms, nextRecords, nextSuggestions] = await Promise.all([listarAulas(), listarLimpiezas(), consultarSugerenciasLimpieza(today)]); setRooms(nextRooms); setRecords(nextRecords); setSuggestions(nextSuggestions); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cargar los registros."); } };
  useEffect(() => { void reload(); void loadMatrix(); }, []);
  const saveRecord = async (payload: { roomIds: string[]; performedAt: string; observation?: string; roomCode: string }, item?: CleaningRecord) => {
    try { const input = { realizadaEn: payload.performedAt, ...(payload.observation ? { observacion: payload.observation } : {}) }; if (item) await actualizarLimpieza(item.id, { aulaId: payload.roomIds[0], ...input }); else await Promise.all(payload.roomIds.map((aulaId) => crearLimpieza({ aulaId, ...input }))); await reload(); setNotice(item ? "Registro actualizado correctamente." : `Limpieza registrada para ${payload.roomIds.length} aula(s).`); setEditor(null); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible guardar el registro."); }
  };
  const loadMatrix = async (selectedMonth = matrixMonth) => { setLoadingMatrix(true); try { const [year, month] = selectedMonth.split("-").map(Number); const first = `${selectedMonth}-01`; const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); setMatrix(await consultarMatrizLimpieza(first, last)); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cargar la matriz."); } finally { setLoadingMatrix(false); } };
  const downloadMatrixPdf = () => { window.print(); };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Seguimiento de Aseo de Aulas</h1><p>Facultad de Ingeniería · Control mensual de limpieza de las aulas de software.</p></div></section>

    <section className={styles.metrics} aria-label="Resumen de limpieza">
      <Metric label="Registros de hoy" value={todayRecords.length} detail="Limpiezas realizadas" tone="green" />
      <Metric label="Aulas atendidas" value={new Set(todayRecords.map((record) => record.roomId)).size} detail={`de ${rooms.length} aulas registradas`} tone="blue" />
      <Metric label="Últimos 7 días" value={records.filter((record) => new Date(record.performedAt).getTime() >= Date.now() - 7 * 86400000).length} detail="Registros en el periodo" tone="violet" />
      <Metric label="Con observación" value={records.filter((record) => record.observation?.trim()).length} detail="Novedades documentadas" tone="amber" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <MatrixView matrix={matrix} loading={loadingMatrix} month={matrixMonth} statusFilter={matrixStatus} suggestions={suggestions} registrationMode={registrationMode} onMonthChange={(value) => { setMatrixMonth(value); void loadMatrix(value); }} onStatusChange={setMatrixStatus} onReload={() => void loadMatrix()} onDownload={downloadMatrixPdf} onRegisterToday={() => setRegistrationMode(true)} onCellClick={(roomId, date) => { const existing = records.find((record) => record.roomId === roomId && record.performedAt.slice(0, 10) === date); if (existing) setEditor(existing); else setMatrixCell({ roomId, date }); }} />

    
    {editor && <CleaningDialog rooms={rooms} item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveRecord} />}
    {matrixCell && <CleaningDialog rooms={rooms} initialRoomId={matrixCell.roomId} initialDate={matrixCell.date} onClose={() => setMatrixCell(null)} onSave={async (payload) => { await saveRecord(payload); setMatrixCell(null); setRegistrationMode(false); void loadMatrix(); }} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function CleaningRow({ rooms, record, onEdit }: { rooms: Room[]; record: CleaningRecord; onEdit: () => void }) {
  const room = rooms.find((item) => item.id === record.roomId);
  return <tr><td><strong className={styles.folio}>{record.folio}</strong><small>{record.id.slice(0, 13)}…</small></td><td><b className={styles.roomCode}>{record.roomCode}</b></td><td><time>{formatDateTime(record.performedAt)}</time><small>{getDayPeriod(record.performedAt)}</small></td><td><span>{room?.location}</span><small>{room?.capacity} puestos</small></td><td>{record.observation ? <span className={styles.observation}>{record.observation}</span> : <span className={styles.noObservation}>Sin observación</span>}</td><td><button type="button" className={styles.editButton} onClick={onEdit}>Editar registro</button></td></tr>;
}

function CoverageView({ rooms, records, onRegister }: { rooms: Room[]; records: CleaningRecord[]; onRegister: () => void }) {
  return <section className={styles.coverageCard}><header><div><h2>Cobertura registrada para hoy</h2><p>Estado derivado de los registros con fecha {new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${today}T12:00:00-05:00`))}.</p></div><span>{new Set(records.map((record) => record.roomId)).size} de {rooms.length} aulas</span></header><div className={styles.floorGroups}>{rooms.map((room) => {
    const roomRecords = records.filter((record) => record.roomId === room.id);
    const latest = roomRecords.sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0];
    return <article key={room.id} className={latest ? styles.coveredRoom : ""}><header><strong>{room.code}</strong><span>{latest ? "Con registro" : "Sin registro hoy"}</span></header>{latest ? <><time>{formatTime(latest.performedAt)}</time><small>{latest.observation ? "Con observación" : "Sin novedades"}</small></> : <button type="button" onClick={onRegister}>Registrar</button>}</article>;
  })}</div></section>;
}

function CleaningDialog({ rooms, item, initialRoomId, initialDate, onClose, onSave }: { rooms: Room[]; item?: CleaningRecord; initialRoomId?: string; initialDate?: string; onClose: () => void; onSave: (payload: { roomIds: string[]; performedAt: string; observation?: string; roomCode: string }, item?: CleaningRecord) => void | Promise<void> }) {
  const [roomIds, setRoomIds] = useState<string[]>(item ? [item.roomId] : initialRoomId ? [initialRoomId] : []);
  const [performedAt, setPerformedAt] = useState(item ? toLocalInput(item.performedAt) : initialDate ? `${initialDate}T08:00` : toLocalInput(new Date().toISOString()));
  const [observation, setObservation] = useState(item?.observation ?? "");
  const [state, setState] = useState<"realizado" | "novedad">(item?.observation ? "novedad" : "realizado");
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(!item);
  const room = rooms.find((current) => current.id === (roomIds[0] ?? item?.roomId));
  useEffect(() => {
    if (item) return;
    let cancelled = false;
    setLoadingSuggestions(true);
    void consultarSugerenciasLimpieza(performedAt.slice(0, 10)).then((next) => { if (!cancelled) setSuggestions(next); }).catch(() => { if (!cancelled) setSuggestions([]); }).finally(() => { if (!cancelled) setLoadingSuggestions(false); });
    return () => { cancelled = true; };
  }, [item, performedAt]);
  const availableRooms = item ? rooms : suggestions.map((suggestion) => rooms.find((current) => current.id === suggestion.aula.id)).filter((current): current is Room => Boolean(current));
  if (!rooms.length) return <div className={styles.backdrop} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true"><header><div><span>Registro operativo</span><h2>No hay aulas disponibles</h2><p>Primero cree un aula para registrar una limpieza.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cerrar</button></footer></section></div>;
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!roomIds.length || !room) return; const detalle = state === "novedad" ? observation.trim() || "Novedad registrada durante la limpieza." : undefined; onSave({ roomIds, roomCode: room.code, performedAt: new Date(performedAt).toISOString(), observation: detalle }, item); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="cleaning-dialog-title"><header><div><span>Registro operativo</span><h2 id="cleaning-dialog-title">{item ? "Editar limpieza" : "Registrar limpieza"}</h2><p>{initialRoomId ? "Seleccione el resultado de la limpieza para el aula y día elegidos." : item ? "Actualice el registro de limpieza." : "Seleccione una o varias aulas disponibles para la jornada."}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}>{item ? <label><span>Aula</span><select value={roomIds[0] ?? ""} onChange={(event) => setRoomIds([event.target.value])}>{rooms.map((current) => <option key={current.id} value={current.id}>{current.code}</option>)}</select></label> : initialRoomId ? <label><span>Aula</span><input value={room?.code ?? ""} readOnly /></label> : <fieldset><legend>Aulas disponibles</legend>{loadingSuggestions ? <p>Consultando aulas disponibles…</p> : availableRooms.length ? availableRooms.map((current) => <label key={current.id}><input type="checkbox" checked={roomIds.includes(current.id)} onChange={(event) => setRoomIds((selected) => event.target.checked ? [...selected, current.id] : selected.filter((id) => id !== current.id))} /> <span>{current.code} · {current.capacity} puestos</span></label>) : <p>No hay aulas disponibles para registrar limpieza en esta fecha.</p>}</fieldset>}<label><span>Fecha</span><input type={initialRoomId ? "text" : "datetime-local"} value={initialRoomId ? initialDate ?? "" : performedAt} onChange={(event) => !initialRoomId && setPerformedAt(event.target.value)} readOnly={Boolean(initialRoomId)} required /></label><label><span>Estado</span><select value={state} onChange={(event) => setState(event.target.value as "realizado" | "novedad")}><option value="realizado">Realizado (V)</option><option value="novedad">Novedad (i)</option></select></label><label className={styles.wideField}><span>Observación <small>{state === "novedad" ? "Detalle la novedad" : "Opcional"}</small></span><textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows={5} placeholder={state === "novedad" ? "Describa la novedad encontrada..." : "Observación opcional..."} /></label></div><div className={styles.formSummary}><span>Aulas seleccionadas <strong>{roomIds.length}</strong></span>{room && <span>{room.capacity} puestos</span>}</div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!roomIds.length || (!initialRoomId && loadingSuggestions)}>{item ? "Guardar cambios" : "Guardar registro"}</button></footer></form></section></div>;
}
function MatrixView({ matrix, loading, month, statusFilter, suggestions, registrationMode, onMonthChange, onStatusChange, onReload, onDownload, onRegisterToday, onCellClick }: { matrix: CleaningMatrix | null; loading: boolean; month: string; statusFilter: "todas" | "realizado" | "sin-registro" | "novedad"; suggestions: CleaningSuggestion[]; registrationMode: boolean; onMonthChange: (value: string) => void; onStatusChange: (value: "todas" | "realizado" | "sin-registro" | "novedad") => void; onReload: () => void; onDownload: () => void; onRegisterToday: () => void; onCellClick: (roomId: string, date: string) => void }) {
  const todayDate = today;
  const getStatus = (jornada: CleaningMatrix["aulas"][number]["jornadas"][number]): "realizado" | "sin-registro" | "novedad" => jornada.registros.length ? jornada.registros.some((registro) => registro.observacion?.trim()) ? "novedad" : "realizado" : "sin-registro";
  const rows = matrix?.aulas.map((aula) => ({ ...aula, jornadas: aula.jornadas.map((jornada) => ({ ...jornada, estado: getStatus(jornada) })) })).filter((aula) => statusFilter === "todas" || aula.jornadas.some((jornada) => jornada.estado === statusFilter)) ?? [];
  const ultimoDiaDelMes = matrix?.fechas.at(-1);
  const cierreMensual = matrix && ultimoDiaDelMes && todayDate >= ultimoDiaDelMes ? matrix.aulas.filter((aula) => !aula.jornadas.some((jornada) => jornada.registros.length)).length : 0;
  return <div className={styles.matrixWorkspace}>
    <section className={styles.contentCard}>
      <header className={styles.cardHeader}>
        <div><h2>Matriz mensual de aseo</h2><p>Seleccione una celda del día actual o anterior para registrar realizado o novedad.</p></div>
        <div className={styles.matrixActions}><button type="button" className={styles.editButton} onClick={() => void onReload()} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button><button type="button" className={styles.editButton} onClick={onDownload}>Descargar PDF</button></div>
      </header>
      <div className={styles.matrixToolbar}>
        <label><span>Mes</span><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></label>
        <label><span>Estado</span><select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as typeof statusFilter)}><option value="todas">Todas</option><option value="realizado">Realizadas</option><option value="novedad">Con novedad</option><option value="sin-registro">Sin registro</option></select></label>
        <div className={styles.legend}><span><b className={styles.stateRealizado}>V</b> Realizado</span><span><b className={styles.stateSinRegistro}>°</b> Sin registro</span><span><b className={styles.stateNovedad}>i</b> Novedad</span></div>
      </div>
      {registrationMode && <p className={styles.registrationMode}>Modo de registro activo: seleccione una celda habilitada de la matriz.</p>}
      {loading && !matrix ? <p className={styles.emptyTable}>Cargando matriz…</p> : matrix && <div className={styles.matrixScroll}><table className={styles.matrixTable}><thead><tr><th>Sala</th>{matrix.fechas.map((fecha) => <th key={fecha}>{fecha.slice(8)}<small>{new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${fecha}T12:00:00`))}</small></th>)}</tr></thead><tbody>{rows.map((aula) => <tr key={aula.id}><th><strong>{aula.codigo}</strong></th>{aula.jornadas.map((jornada) => { const editable = registrationMode && (jornada.fecha === todayDate || jornada.fecha === previousDay(todayDate)); return <td key={jornada.fecha}><button type="button" disabled={!editable} className={styles[`cell_${jornada.estado}`]} title={editable ? `${aula.codigo} · ${jornada.fecha} · seleccionar Realizado o Novedad` : registrationMode ? `${aula.codigo} · ${jornada.fecha} · bloqueado para edición` : "Active Registrar aseo de hoy para modificar la matriz"} onClick={() => onCellClick(aula.id, jornada.fecha)}>{jornada.estado === "realizado" ? "V" : jornada.estado === "sin-registro" ? "°" : "i"}</button></td>; })}</tr>)}</tbody></table></div>}{!matrix && !loading && <p className={styles.emptyTable}>No hay información de matriz para el mes seleccionado.</p>}
    </section>
    <aside className={styles.recommendationPanel}>
      <header><strong>Aulas recomendadas</strong><span>{suggestions.length} disponibles hoy</span></header>
      <p>Priorizadas según disponibilidad y tiempo desde la última limpieza.</p>
      <div>{suggestions.slice(0, 8).map((suggestion) => <button type="button" key={suggestion.aula.id} onClick={onRegisterToday}><b>{suggestion.aula.codigo}</b><span>{suggestion.diasSinLimpieza === null ? "Sin historial de limpieza" : `${suggestion.diasSinLimpieza} día(s) desde la última limpieza`}</span></button>)}{!suggestions.length && <small>No hay aulas disponibles para recomendar en este momento.</small>}</div>
      {cierreMensual > 0 && <div className={styles.monthClosing}>Cierre mensual: {cierreMensual} aula(s) no registran limpieza durante este mes.</div>}
      <button type="button" className="button-primary" onClick={onRegisterToday}>{registrationMode ? "Seleccione una celda" : "Registrar aseo de hoy"}</button>
    </aside>
  </div>;
}

function previousDay(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
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
