"use client";

import { useEffect, useState } from "react";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { actualizarLimpieza, consultarMatrizLimpieza, consultarSugerenciasLimpieza, crearLimpieza, eliminarLimpieza, listarLimpiezas, type CleaningMatrix, type CleaningSuggestion } from "@/features/limpieza/api/limpiezaApi";
import { listarObservaciones } from "@/features/observaciones/api/observacionesApi";
import type { Room } from "@/features/aulas/types";
import type { CleaningRecord } from "@/features/limpieza/types";
import type { OperationalObservation } from "@/features/observaciones/types";
import styles from "./CleaningView.module.css";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
type PendingMatrixChange = { roomId: string; date: string; roomCode: string; status: "realizado" | "novedad"; observation?: string; record?: CleaningRecord };

export function CleaningView() {
  const [records, setRecords] = useState<CleaningRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editor, setEditor] = useState<CleaningRecord | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<CleaningMatrix | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixMonth, setMatrixMonth] = useState(today.slice(0, 7));
  const [matrixStatus, setMatrixStatus] = useState<"todas" | "realizado" | "sin-registro" | "novedad">("todas");
  const [matrixCell, setMatrixCell] = useState<{ roomId: string; date: string; status: "realizado" | "sin-registro" | "novedad"; readOnly: boolean; blockReason?: string; record?: CleaningRecord } | null>(null);
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [observations, setObservations] = useState<OperationalObservation[]>([]);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingMatrixChange[]>([]);

  const todayRecords = records.filter((record) => record.performedAt.slice(0, 10) === today);

  const reload = async () => { try { const [nextRooms, nextRecords, nextSuggestions, nextObservations] = await Promise.all([listarAulas(), listarLimpiezas(), consultarSugerenciasLimpieza(today), listarObservaciones()]); setRooms(nextRooms); setRecords(nextRecords); setSuggestions(nextSuggestions); setObservations(nextObservations); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cargar los registros."); } };
  useEffect(() => { void reload(); void loadMatrix(); }, []);
  const saveRecord = async (payload: { roomIds: string[]; performedAt: string; observation?: string; roomCode: string; status: "realizado" | "novedad" }, item?: CleaningRecord) => {
    try { const input = { realizadaEn: payload.performedAt, estado: payload.status === "novedad" ? "NOVEDAD" as const : "REALIZADA" as const, ...(payload.observation ? { observacion: payload.observation } : {}) }; if (item) await actualizarLimpieza(item.id, { aulaId: payload.roomIds[0], ...input, ...(item.observation && !payload.observation ? { limpiarObservacion: true } : {}) }); else await Promise.all(payload.roomIds.map((aulaId) => crearLimpieza({ aulaId, ...input }))); await reload(); setNotice(item ? "Registro actualizado correctamente." : `Limpieza registrada para ${payload.roomIds.length} aula(s).`); setEditor(null); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible guardar el registro."); }
  };
  const loadMatrix = async (selectedMonth = matrixMonth) => { setLoadingMatrix(true); try { const [year, month] = selectedMonth.split("-").map(Number); const first = `${selectedMonth}-01`; const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); setMatrix(await consultarMatrizLimpieza(first, last)); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cargar la matriz."); } finally { setLoadingMatrix(false); } };
  const downloadMatrixPdf = () => { window.print(); };
  const acceptPendingChanges = async () => {
    if (!pendingChanges.length) { setNotice("Seleccione al menos una celda antes de aceptar el registro."); return; }
    try {
      await Promise.all(pendingChanges.map((change) => {
        const input = { aulaId: change.roomId, realizadaEn: new Date(`${change.date}T08:00:00-05:00`).toISOString(), estado: change.status === "novedad" ? "NOVEDAD" as const : "REALIZADA" as const, ...(change.observation ? { observacion: change.observation } : {}) };
        return change.record ? actualizarLimpieza(change.record.id, { ...input, ...(change.record.observation && !change.observation ? { limpiarObservacion: true } : {}) }) : crearLimpieza(input);
      }));
      setNotice(`${pendingChanges.length} registro(s) de aseo guardado(s) correctamente.`);
      setPendingChanges([]);
      setRegistrationMode(false);
      await Promise.all([reload(), loadMatrix()]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible guardar los registros seleccionados."); }
  };
  const cancelPendingChanges = () => { setPendingChanges([]); setRegistrationMode(false); setNotice("Registro de aseo cancelado. No se guardaron cambios."); };
  const removeRecord = async (record: CleaningRecord) => {
    try { await eliminarLimpieza(record.id); setNotice("El estado de limpieza fue retirado correctamente."); setEditor(null); setMatrixCell(null); await Promise.all([reload(), loadMatrix()]); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible retirar el registro de limpieza."); }
  };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Seguimiento de Aseo de Aulas</h1><p>Facultad de Ingeniería · Control mensual de limpieza de las aulas de software.</p></div></section>

    <section className={styles.metrics} aria-label="Resumen de limpieza">
      <Metric label="Registros de hoy" value={todayRecords.length} detail="Limpiezas realizadas" tone="green" />
      <Metric label="Aulas atendidas" value={new Set(todayRecords.map((record) => record.roomId)).size} detail={`de ${rooms.length} aulas registradas`} tone="blue" />
      <Metric label="Últimos 7 días" value={records.filter((record) => new Date(record.performedAt).getTime() >= Date.now() - 7 * 86400000).length} detail="Registros en el periodo" tone="violet" />
      <Metric label="Con observación" value={records.filter((record) => record.observation?.trim()).length} detail="Novedades documentadas" tone="amber" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <MatrixView matrix={matrix} records={records} loading={loadingMatrix} month={matrixMonth} statusFilter={matrixStatus} suggestions={suggestions} observations={observations} registrationMode={registrationMode} pendingChanges={pendingChanges} onMonthChange={(value) => { setMatrixMonth(value); void loadMatrix(value); }} onStatusChange={setMatrixStatus} onDownload={downloadMatrixPdf} onRegisterToday={() => registrationMode ? void acceptPendingChanges() : setRegistrationMode(true)} onCancelRegistration={cancelPendingChanges} onCellClick={(roomId, date, canEdit, status, blockReason) => { const existing = records.find((record) => record.roomId === roomId && record.performedAt.slice(0, 10) === date); setMatrixCell({ roomId, date, status, readOnly: !canEdit, ...(blockReason ? { blockReason } : {}), ...(existing ? { record: existing } : {}) }); }} />

    
    {editor && <CleaningDialog rooms={rooms} item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveRecord} onRemove={editor === "new" ? undefined : () => void removeRecord(editor)} />}
    {matrixCell?.readOnly && <MatrixStatusDialog room={rooms.find((room) => room.id === matrixCell.roomId)} date={matrixCell.date} status={matrixCell.status} observation={matrixCell.record?.observation} blockReason={matrixCell.blockReason} onClose={() => setMatrixCell(null)} />}
    {matrixCell && !matrixCell.readOnly && <CleaningDialog rooms={rooms} item={matrixCell.record} initialRoomId={matrixCell.roomId} initialDate={matrixCell.date} onClose={() => setMatrixCell(null)} onRemove={matrixCell.record ? () => void removeRecord(matrixCell.record!) : undefined} onSave={(payload, record) => { setPendingChanges((current) => [...current.filter((change) => change.roomId !== matrixCell.roomId || change.date !== matrixCell.date), { roomId: matrixCell.roomId, date: matrixCell.date, roomCode: payload.roomCode, status: payload.status, ...(payload.observation ? { observation: payload.observation } : {}), ...(record ? { record } : {}) }]); setMatrixCell(null); }} />}
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

function MatrixStatusDialog({ room, date, status, observation, blockReason, onClose }: { room?: Room; date: string; status: "realizado" | "sin-registro" | "novedad"; observation?: string; blockReason?: string; onClose: () => void }) {
  const label = status === "realizado" ? "Realizado" : status === "novedad" ? "Con novedad" : "Sin registro";
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="matrix-status-title"><header><div><span>{blockReason ? "Registro no disponible" : "Consulta de matriz"}</span><h2 id="matrix-status-title">{blockReason ? "Limpieza restringida" : "Estado de la sala"}</h2><p>{room?.code ?? "Aula"} · {date}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><div className={styles.statusDialogBody}><strong className={blockReason ? styles.status_blocked : styles[`status_${status}`]}>{blockReason ? "No se puede registrar" : label}</strong><p>{blockReason || observation || (status === "sin-registro" ? "No hay limpieza registrada para este día." : "No hay observaciones adicionales.")}</p><small>{blockReason ? "La sala volverá a estar disponible para registro después de cumplir el intervalo de dos días." : "Para modificar esta celda active “Registrar aseo de hoy” y seleccione una fecha habilitada."}</small><button type="button" className="button-primary" onClick={onClose}>Entendido</button></div></section></div>;
}

function CleaningDialog({ rooms, item, initialRoomId, initialDate, onClose, onSave, onRemove }: { rooms: Room[]; item?: CleaningRecord; initialRoomId?: string; initialDate?: string; onClose: () => void; onSave: (payload: { roomIds: string[]; performedAt: string; observation?: string; roomCode: string; status: "realizado" | "novedad" }, item?: CleaningRecord) => void | Promise<void>; onRemove?: () => void }) {
  const [roomIds, setRoomIds] = useState<string[]>(item ? [item.roomId] : initialRoomId ? [initialRoomId] : []);
  const [performedAt, setPerformedAt] = useState(item ? toLocalInput(item.performedAt) : initialDate ? `${initialDate}T08:00` : toLocalInput(new Date().toISOString()));
  const [observation, setObservation] = useState(item?.observation ?? "");
  const [state, setState] = useState<"realizado" | "novedad">(item?.status === "NOVEDAD" ? "novedad" : "realizado");
  const [confirmRemove, setConfirmRemove] = useState(false);
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
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!roomIds.length || !room) return; const detalle = observation.trim() || (state === "novedad" ? "Novedad registrada durante la limpieza." : undefined); onSave({ roomIds, roomCode: room.code, performedAt: new Date(performedAt).toISOString(), status: state, observation: detalle }, item); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="cleaning-dialog-title"><header><div><span>Registro operativo</span><h2 id="cleaning-dialog-title">{item ? "Editar limpieza" : "Registrar limpieza"}</h2><p>{initialRoomId ? "Seleccione el resultado de la limpieza para el aula y día elegidos." : item ? "Actualice el registro de limpieza." : "Seleccione una o varias aulas disponibles para la jornada."}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}>{initialRoomId ? <label><span>Aula</span><input value={room?.code ?? ""} readOnly /></label> : item ? <label><span>Aula</span><select value={roomIds[0] ?? ""} onChange={(event) => setRoomIds([event.target.value])}>{rooms.map((current) => <option key={current.id} value={current.id}>{current.code}</option>)}</select></label> : <fieldset><legend>Aulas disponibles</legend>{loadingSuggestions ? <p>Consultando aulas disponibles…</p> : availableRooms.length ? availableRooms.map((current) => <label key={current.id}><input type="checkbox" checked={roomIds.includes(current.id)} onChange={(event) => setRoomIds((selected) => event.target.checked ? [...selected, current.id] : selected.filter((id) => id !== current.id))} /> <span>{current.code} · {current.capacity} puestos</span></label>) : <p>No hay aulas disponibles para registrar limpieza en esta fecha.</p>}</fieldset>}<label><span>Fecha</span><input type={initialRoomId ? "text" : "datetime-local"} value={initialRoomId ? initialDate ?? "" : performedAt} onChange={(event) => !initialRoomId && setPerformedAt(event.target.value)} readOnly={Boolean(initialRoomId)} required /></label><label><span>Estado</span><select value={state} onChange={(event) => setState(event.target.value as "realizado" | "novedad")}><option value="realizado">Realizado (R)</option><option value="novedad">Novedad (N)</option></select></label><label className={styles.wideField}><span>Observación <small>{state === "novedad" ? "Detalle la novedad" : "Opcional"}</small></span><textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows={5} placeholder={state === "novedad" ? "Describa la novedad encontrada..." : "Observación opcional..."} /></label></div>{confirmRemove && <div className={styles.removeConfirmation}><strong>¿Quitar este registro de limpieza?</strong><span>La celda volverá a quedar sin registro.</span><div><button type="button" className={styles.dialogCancel} onClick={() => setConfirmRemove(false)}>Conservar</button><button type="button" className={styles.removeButton} onClick={onRemove}>Quitar registro</button></div></div>}<div className={styles.formSummary}><span>Aulas seleccionadas <strong>{roomIds.length}</strong></span>{room && <span>{room.capacity} puestos</span>}</div><footer>{onRemove && <button type="button" className={styles.removeButton} onClick={() => setConfirmRemove(true)}>Quitar estado</button>}<button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!roomIds.length || (!initialRoomId && loadingSuggestions)}>{item ? "Guardar cambios" : "Guardar registro"}</button></footer></form></section></div>;
}
function MatrixView({ matrix, records, loading, month, statusFilter, suggestions, observations, registrationMode, pendingChanges, onMonthChange, onStatusChange, onDownload, onRegisterToday, onCancelRegistration, onCellClick }: { matrix: CleaningMatrix | null; records: CleaningRecord[]; loading: boolean; month: string; statusFilter: "todas" | "realizado" | "sin-registro" | "novedad"; suggestions: CleaningSuggestion[]; observations: OperationalObservation[]; registrationMode: boolean; pendingChanges: PendingMatrixChange[]; onMonthChange: (value: string) => void; onStatusChange: (value: "todas" | "realizado" | "sin-registro" | "novedad") => void; onDownload: () => void; onRegisterToday: () => void; onCancelRegistration: () => void; onCellClick: (roomId: string, date: string, canEdit: boolean, status: "realizado" | "sin-registro" | "novedad", blockReason?: string) => void }) {
  const todayDate = today;
  const getStatus = (jornada: CleaningMatrix["aulas"][number]["jornadas"][number]): "realizado" | "sin-registro" | "novedad" => !jornada.registros.length ? "sin-registro" : jornada.registros.some((registro) => registro.estado === "NOVEDAD") ? "novedad" : "realizado";
  const rows = matrix?.aulas.map((aula) => ({ ...aula, jornadas: aula.jornadas.map((jornada) => { const pending = pendingChanges.find((change) => change.roomId === aula.id && change.date === jornada.fecha); return { ...jornada, estado: pending ? pending.status : getStatus(jornada), pendienteDeGuardar: Boolean(pending) }; }) })).filter((aula) => statusFilter === "todas" || aula.jornadas.some((jornada) => jornada.estado === statusFilter)) ?? [];
  const ultimoDiaDelMes = matrix?.fechas.at(-1);
  const cierreMensual = matrix && ultimoDiaDelMes && todayDate >= ultimoDiaDelMes ? matrix.aulas.filter((aula) => !aula.jornadas.some((jornada) => jornada.registros.length)).length : 0;
  return <div className={styles.matrixWorkspace}>
    <section className={styles.contentCard}>
      <header className={styles.cardHeader}>
        <div><h2>Matriz mensual de aseo</h2><p>Seleccione una celda del día actual o anterior para registrar realizado o novedad.</p></div>
        <div className={styles.matrixActions}><button type="button" className={styles.editButton} onClick={onDownload}>Descargar PDF</button></div>
      </header>
      <div className={styles.matrixToolbar}>
        <label><span>Mes</span><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></label>
        <label><span>Estado</span><select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as typeof statusFilter)}><option value="todas">Todas</option><option value="realizado">Realizadas</option><option value="novedad">Con novedad</option><option value="sin-registro">Sin registro</option></select></label>
        <div className={styles.legend}><span><b className={styles.stateRealizado}>R</b> Realizado</span><span><b className={styles.stateSinRegistro}>°</b> Sin registro</span><span><b className={styles.stateNovedad}>N</b> Novedad</span></div>
      </div>
      {registrationMode && <p className={styles.registrationMode}>Modo de registro activo: seleccione una o varias celdas habilitadas. Hay {pendingChanges.length} cambio(s) pendiente(s) de aceptar.</p>}
      {loading && !matrix ? <p className={styles.emptyTable}>Cargando matriz…</p> : matrix && <div className={styles.matrixScroll}><table className={styles.matrixTable}><thead><tr><th>Sala</th>{matrix.fechas.map((fecha) => <th key={fecha}>{fecha.slice(8)}<small>{new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${fecha}T12:00:00`))}</small></th>)}</tr></thead><tbody>{rows.map((aula) => <tr key={aula.id}><th><strong>{aula.codigo}</strong></th>{aula.jornadas.map((jornada) => { const fechasRestringidas = [previousDay(jornada.fecha), daysBefore(jornada.fecha, 2)]; const tieneRegistroReciente = records.some((record) => record.roomId === aula.id && fechasRestringidas.includes(record.performedAt.slice(0, 10))); const esFechaFutura = jornada.fecha > todayDate; const esFechaEditable = jornada.fecha === todayDate || jornada.fecha === previousDay(todayDate); const bloqueadaPorIntervalo = registrationMode && esFechaEditable && !jornada.registros.length && tieneRegistroReciente; const editable = registrationMode && esFechaEditable && !bloqueadaPorIntervalo; const roomObservations = observations.filter((observation) => observation.roomId === aula.id).slice(0, 2); const statusLabel = jornada.estado === "realizado" ? "Realizado" : jornada.estado === "novedad" ? "Con novedad" : "Sin registro"; const blockReason = bloqueadaPorIntervalo ? "No se permite registrar limpieza: esta aula ya fue atendida uno o dos días antes." : registrationMode && esFechaFutura ? "No se permite registrar una limpieza con fecha futura." : undefined; const cellTitle = !registrationMode ? "Consultar estado de la sala" : !esFechaEditable ? blockReason ?? "Esta fecha está bloqueada para edición" : blockReason ?? `${aula.codigo} · ${jornada.fecha} · seleccionar Realizado o Novedad`; return <td key={jornada.fecha} className={styles.matrixCell}><button type="button" className={`${styles[`cell_${jornada.estado}`]} ${jornada.pendienteDeGuardar ? styles.pendingSave : ""}`} title={cellTitle} onClick={() => onCellClick(aula.id, jornada.fecha, editable, jornada.estado, blockReason)}>{jornada.estado === "realizado" ? "R" : jornada.estado === "sin-registro" ? "°" : "N"}</button><span className={styles.cellTooltip}><strong>{aula.codigo} · {jornada.fecha}</strong><span className={styles.cellStatus}>Estado: {statusLabel}</span>{jornada.registros[0]?.observacion && <span>{jornada.registros[0].observacion}</span>}{roomObservations.length > 0 && <><em>Observaciones de la sala</em>{roomObservations.map((observation) => <span key={observation.id}>{observation.content}</span>)}</>}</span></td>; })}</tr>)}</tbody></table></div>}{!matrix && !loading && <p className={styles.emptyTable}>No hay información de matriz para el mes seleccionado.</p>}
    </section>
    <aside className={styles.recommendationPanel}>
      <header><strong>Aulas recomendadas</strong><span>{suggestions.length} disponibles hoy</span></header>
      <p>Priorizadas según disponibilidad y tiempo desde la última limpieza.</p><div>{suggestions.slice(0, 8).map((suggestion) => <button type="button" key={suggestion.aula.id} onClick={onRegisterToday}><b>{suggestion.aula.codigo}</b><span>{suggestion.diasSinLimpieza === null ? "Sin historial de limpieza" : `${suggestion.diasSinLimpieza} día(s) desde la última limpieza`}</span></button>)}{!suggestions.length && <small>No hay aulas disponibles para recomendar en este momento.</small>}</div>{cierreMensual > 0 && <div className={styles.monthClosing}>Cierre mensual: {cierreMensual} aula(s) no registran limpieza durante este mes.</div>}<footer className={styles.registrationActions}><button type="button" className="button-primary" onClick={onRegisterToday}>{registrationMode ? `Aceptar registros (${pendingChanges.length})` : "Registrar aseo de hoy"}</button>{registrationMode && <button type="button" className={styles.dialogCancel} onClick={onCancelRegistration}>Cancelar</button>}</footer>
    </aside>
  </div>;
}

function previousDay(value: string) {
  return daysBefore(value, 1);
}

function daysBefore(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - days);
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
