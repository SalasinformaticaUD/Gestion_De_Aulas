"use client";

import { useMemo, useState } from "react";
import {
  availabilityRooms,
  getAvailabilityForBlock,
  getEndTime,
  operatingBlocks,
} from "@/features/disponibilidad/data/availability";
import { initialTeacherLoans, teachers } from "@/features/prestamos-docentes/data/teacherLoans";
import type { TeacherLoan, TeacherLoanStatus } from "@/features/prestamos-docentes/types";
import styles from "./TeacherLoansView.module.css";

type LoanView = "gestion" | "historial";

const statusLabels: Record<TeacherLoanStatus, string> = {
  SOLICITADO: "Solicitado",
  APROBADO: "Aprobado",
  ACTIVO: "Activo",
  DEVUELTO: "Finalizado",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
};

const currentStatuses: TeacherLoanStatus[] = ["SOLICITADO", "APROBADO", "ACTIVO"];
const historyStatuses: TeacherLoanStatus[] = ["DEVUELTO", "CANCELADO", "VENCIDO"];

export function TeacherLoansView() {
  const [loans, setLoans] = useState(initialTeacherLoans);
  const [view, setView] = useState<LoanView>("gestion");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const currentLoans = loans.filter((loan) => currentStatuses.includes(loan.status));
  const historicalLoans = loans.filter((loan) => historyStatuses.includes(loan.status));
  const visibleLoans = useMemo(() => {
    const source = view === "gestion" ? currentLoans : historicalLoans;
    const normalized = query.trim().toLocaleLowerCase("es");
    return source.filter((loan) =>
      (statusFilter === "todos" || loan.status === statusFilter) &&
      (!dateFilter || loan.start.slice(0, 10) === dateFilter) &&
      (!normalized || `${loan.id} ${loan.teacher.name} ${loan.teacher.document} ${loan.roomCode} ${loan.reason ?? ""}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [currentLoans, dateFilter, historicalLoans, query, statusFilter, view]);

  const changeView = (next: LoanView) => {
    setView(next);
    setStatusFilter("todos");
  };

  const approveLoan = (target: TeacherLoan) => {
    if (target.status !== "SOLICITADO") return;
    const conflict = loans.some((loan) =>
      loan.id !== target.id && loan.roomId === target.roomId &&
      (loan.status === "APROBADO" || loan.status === "ACTIVO") &&
      loan.start < target.end && loan.end > target.start,
    );
    if (conflict) {
      setNotice({ tone: "error", text: `${target.id} no pudo aprobarse: el aula ${target.roomCode} tiene otro préstamo aprobado o activo en ese bloque.` });
      return;
    }
    setLoans((current) => current.map((loan) => loan.id === target.id ? { ...loan, status: "APROBADO" } : loan));
    setNotice({ tone: "success", text: `${target.id} aprobado. La disponibilidad y los cruces fueron revalidados.` });
  };

  const cancelLoan = (target: TeacherLoan) => {
    if (target.status !== "SOLICITADO" && target.status !== "APROBADO") return;
    setLoans((current) => current.map((loan) => loan.id === target.id ? { ...loan, status: "CANCELADO" } : loan));
    setNotice({ tone: "success", text: `${target.id} cancelado. El bloque del aula ${target.roomCode} fue liberado.` });
  };

  const finishLoan = (target: TeacherLoan) => {
    if (target.status !== "APROBADO" && target.status !== "ACTIVO") return;
    setLoans((current) => current.map((loan) => loan.id === target.id ? { ...loan, status: "DEVUELTO" } : loan));
    setNotice({ tone: "success", text: `${target.id} finalizado correctamente.` });
  };

  const createLoan = (payload: Omit<TeacherLoan, "id" | "status">) => {
    const nextNumber = Math.max(...loans.map((loan) => Number(loan.id.slice(-4)))) + 1;
    const id = `PD-2026-${String(nextNumber).padStart(4, "0")}`;
    setLoans((current) => [{ ...payload, id, status: "SOLICITADO" }, ...current]);
    setShowRequest(false);
    setView("gestion");
    setNotice({ tone: "success", text: `${id} creada en estado Solicitado. Debe aprobarse antes de reservar el aula.` });
  };

  return <>
    <section className={`page-heading ${styles.heading}`}>
      <div><h1>Préstamos Docentes</h1><p>Solicitud y seguimiento de aulas para actividades académicas docentes.</p></div>
      <button type="button" className="button-primary" onClick={() => setShowRequest(true)}>+ Nueva solicitud</button>
    </section>

    <section className={styles.metrics} aria-label="Resumen de préstamos docentes">
      <Metric label="Pendientes" value={loans.filter((loan) => loan.status === "SOLICITADO").length} detail="Requieren aprobación" tone="amber" />
      <Metric label="Aprobados" value={loans.filter((loan) => loan.status === "APROBADO").length} detail="Aulas reservadas" tone="blue" />
      <Metric label="Activos" value={loans.filter((loan) => loan.status === "ACTIVO").length} detail="En desarrollo ahora" tone="green" />
      <Metric label="Finalizados" value={loans.filter((loan) => loan.status === "DEVUELTO").length} detail="Devolución registrada" tone="neutral" />
    </section>

    {notice && <div className={`${styles.notice} ${notice.tone === "error" ? styles.noticeError : ""}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <section className={styles.contentCard}>
      <header className={styles.cardHeader}>
        <div className={styles.tabs} role="tablist" aria-label="Vista de préstamos">
          <button type="button" role="tab" aria-selected={view === "gestion"} className={view === "gestion" ? styles.activeTab : ""} onClick={() => changeView("gestion")}>Gestión actual <span>{currentLoans.length}</span></button>
          <button type="button" role="tab" aria-selected={view === "historial"} className={view === "historial" ? styles.activeTab : ""} onClick={() => changeView("historial")}>Historial <span>{historicalLoans.length}</span></button>
        </div>
        <div className={styles.context}><i />{view === "gestion" ? "Solicitudes y reservas vigentes" : "Préstamos cerrados"}</div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar docente, documento, aula o solicitud..." aria-label="Buscar préstamos docentes" /></label>
        <label><span>Estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos</option>{(view === "gestion" ? currentStatuses : historyStatuses).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
        <label><span>Fecha</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
        <span className={styles.resultCount}>{visibleLoans.length} resultado(s)</span>
      </div>

      <div className="table-wrap"><table className={styles.loanTable}><thead><tr><th>Solicitud</th><th>Docente</th><th>Aula</th><th>Fecha y bloque</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {visibleLoans.map((loan) => <LoanRow key={loan.id} loan={loan} onApprove={() => approveLoan(loan)} onCancel={() => cancelLoan(loan)} onFinish={() => finishLoan(loan)} />)}
        {visibleLoans.length === 0 && <tr><td colSpan={7} className={styles.emptyTable}>No hay préstamos para los filtros seleccionados.</td></tr>}
      </tbody></table></div>
    </section>

    <aside className={styles.ruleNote}><span aria-hidden="true">i</span><p><strong>Reglas aplicadas por el Core:</strong> cada préstamo ocupa un bloque exacto de dos horas. Al aprobar, se comprueba nuevamente la disponibilidad del aula y se impiden cruces con préstamos aprobados o activos. Solo las solicitudes y aprobaciones pueden cancelarse.</p></aside>

    {showRequest && <RequestLoanDialog loans={loans} onClose={() => setShowRequest(false)} onSubmit={createLoan} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function LoanRow({ loan, onApprove, onCancel, onFinish }: { loan: TeacherLoan; onApprove: () => void; onCancel: () => void; onFinish: () => void }) {
  const date = new Date(loan.start);
  const formatTime = (value: string) => new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
  return <tr>
    <td><strong className={styles.loanId}>{loan.id}</strong><small>Creada por coordinación</small></td>
    <td><strong>{loan.teacher.name}</strong><small>CC {loan.teacher.document} · {loan.teacher.faculty}</small></td>
    <td><b className={styles.roomCode}>{loan.roomCode}</b></td>
    <td><time>{new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Bogota" }).format(date)}</time><small>{formatTime(loan.start)}–{formatTime(loan.end)}</small></td>
    <td><span className={styles.reason}>{loan.reason || "Sin motivo registrado"}</span></td>
    <td><StatusBadge status={loan.status} /></td>
    <td><div className={styles.actions}>{loan.status === "SOLICITADO" && <button type="button" className={styles.approveButton} onClick={onApprove}>Aprobar</button>}{(loan.status === "APROBADO" || loan.status === "ACTIVO") && <button type="button" className={styles.finishButton} onClick={onFinish}>Finalizar</button>}{(loan.status === "SOLICITADO" || loan.status === "APROBADO") && <button type="button" className={styles.cancelButton} onClick={onCancel}>Cancelar</button>}{historyStatuses.includes(loan.status) && <span>—</span>}</div></td>
  </tr>;
}

function StatusBadge({ status }: { status: TeacherLoanStatus }) {
  return <span className={`${styles.status} ${styles[`status_${status.toLocaleLowerCase()}`]}`}><i />{statusLabels[status]}</span>;
}

function RequestLoanDialog({ loans, onClose, onSubmit }: { loans: TeacherLoan[]; onClose: () => void; onSubmit: (payload: Omit<TeacherLoan, "id" | "status">) => void }) {
  const [teacherId, setTeacherId] = useState(teachers[0].id);
  const [date, setDate] = useState("2026-08-25");
  const [startTime, setStartTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const suggestions = availabilityRooms
    .map((room) => getAvailabilityForBlock(room, date, startTime))
    .filter((result) => result.calculatedState === "disponible")
    .filter((result) => !loans.some((loan) => loan.roomId === result.room.id && (loan.status === "APROBADO" || loan.status === "ACTIVO") && loan.start < `${date}T${getEndTime(startTime)}:00-05:00` && loan.end > `${date}T${startTime}:00-05:00`))
    .sort((a, b) => a.room.capacity - b.room.capacity || a.room.code.localeCompare(b.room.code));
  const selectedResult = suggestions.find((result) => result.room.id === selectedRoomId);
  const teacher = teachers.find((item) => item.id === teacherId);

  const changeBlock = (next: { date?: string; startTime?: string }) => {
    if (next.date !== undefined) setDate(next.date);
    if (next.startTime !== undefined) setStartTime(next.startTime);
    setSelectedRoomId("");
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!teacher || !selectedResult) return;
    onSubmit({ teacher, roomId: selectedResult.room.id, roomCode: selectedResult.room.code, start: `${date}T${startTime}:00-05:00`, end: `${date}T${getEndTime(startTime)}:00-05:00`, reason: reason.trim() || undefined });
  };

  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="loan-dialog-title"><header><div><span>Nueva reserva académica</span><h2 id="loan-dialog-title">Solicitud de préstamo docente</h2><p>Seleccione el docente, el bloque y una de las aulas disponibles.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}>
    <fieldset className={styles.formSection}><legend><b>1</b> Docente y actividad</legend><div className={styles.formGrid}><label className={styles.wideField}><span>Docente responsable</span><select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.faculty}</option>)}</select></label><label className={styles.wideField}><span>Motivo de la solicitud <small>Opcional · {reason.length}/500</small></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Ej. Taller complementario de la asignatura..." /></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>2</b> Bloque exacto de dos horas</legend><div className={styles.formGrid}><label><span>Fecha</span><input type="date" value={date} onChange={(event) => changeBlock({ date: event.target.value })} required /></label><label><span>Horario</span><select value={startTime} onChange={(event) => changeBlock({ startTime: event.target.value })}>{operatingBlocks.map((block) => <option key={block} value={block}>{block}–{getEndTime(block)}</option>)}</select></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>3</b> Aula disponible <span>{suggestions.length} resultado(s)</span></legend><div className={styles.roomSuggestions}>{suggestions.slice(0, 10).map((result) => <button key={result.room.id} type="button" className={selectedRoomId === result.room.id ? styles.selectedRoom : ""} onClick={() => setSelectedRoomId(result.room.id)}><strong>{result.room.code}</strong><span>{result.room.capacity} puestos · Piso {result.room.floor}</span><small>{result.room.location}</small></button>)}{suggestions.length === 0 && <p className={styles.noSuggestions}>No hay aulas disponibles para este bloque.</p>}</div></fieldset>
    <div className={styles.validationSummary}><span className={teacher ? styles.checkOk : ""}>{teacher ? "✓" : "1"} Docente válido</span><span className={selectedResult ? styles.checkOk : ""}>{selectedResult ? "✓" : "2"} Aula disponible</span><span className={styles.checkOk}>✓ Bloque de 2 h</span></div>
    <aside className={styles.approvalHint}><strong>La solicitud quedará pendiente.</strong> La aprobación posterior vuelve a validar la disponibilidad y los cruces del aula.</aside>
    <footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!teacher || !selectedResult}>Crear solicitud →</button></footer>
  </form></section></div>;
}
