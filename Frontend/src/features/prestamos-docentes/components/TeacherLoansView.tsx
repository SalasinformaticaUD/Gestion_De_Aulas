"use client";

import { useEffect, useMemo, useState } from "react";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { listarDocentes, type DocenteCatalogo } from "@/features/catalogos/api/catalogosApi";
import { aprobarPrestamoDocente, cancelarPrestamoDocente, crearPrestamoDocente, finalizarPrestamoDocente, listarPrestamosDocentes } from "@/features/prestamos-docentes/api/prestamosDocentesApi";
import type { Room } from "@/features/aulas/types";
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
  const [loans, setLoans] = useState<TeacherLoan[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<DocenteCatalogo[]>([]);
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

  const reload = async () => { try { const [nextLoans, nextRooms, nextTeachers] = await Promise.all([listarPrestamosDocentes(), listarAulas(), listarDocentes()]); setLoans(nextLoans); setRooms(nextRooms); setTeachers(nextTeachers); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible cargar préstamos." }); } };
  useEffect(() => { void reload(); }, []);
  const approveLoan = async (target: TeacherLoan) => {
    if (target.status !== "SOLICITADO") return;
    try { await aprobarPrestamoDocente(target.id); await reload(); setNotice({ tone: "success", text: `${target.id} aprobado.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible aprobar." }); }
  };

  const cancelLoan = async (target: TeacherLoan) => {
    if (target.status !== "SOLICITADO" && target.status !== "APROBADO") return;
    try { await cancelarPrestamoDocente(target.id); await reload(); setNotice({ tone: "success", text: `${target.id} cancelado.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible cancelar." }); }
  };

  const finishLoan = async (target: TeacherLoan) => {
    if (target.status !== "APROBADO" && target.status !== "ACTIVO") return;
    try { await finalizarPrestamoDocente(target.id); await reload(); setNotice({ tone: "success", text: `${target.id} finalizado.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible finalizar." }); }
  };

  const createLoan = async (payload: { docenteId: string; aulaId: string; inicio: string; fin: string; motivo?: string }) => {
    try { await crearPrestamoDocente(payload); await reload(); setShowRequest(false); setView("gestion"); setNotice({ tone: "success", text: "Solicitud creada en estado solicitado." }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible crear la solicitud." }); }
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

    

    {showRequest && <RequestLoanDialog rooms={rooms} teachers={teachers} onClose={() => setShowRequest(false)} onSubmit={createLoan} />}
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

function RequestLoanDialog({ rooms, teachers, onClose, onSubmit }: { rooms: Room[]; teachers: DocenteCatalogo[]; onClose: () => void; onSubmit: (payload: { docenteId: string; aulaId: string; inicio: string; fin: string; motivo?: string }) => void | Promise<void> }) {
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()));
  const [startTime, setStartTime] = useState("08:00");
  const [reason, setReason] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const suggestions = rooms.filter((room) => room.status === "disponible").sort((a, b) => a.capacity - b.capacity || a.code.localeCompare(b.code));
  const selectedRoom = suggestions.find((room) => room.id === selectedRoomId);
  const teacher = teachers.find((item) => item.id === teacherId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!teacher || !selectedRoom) return;
    const endHour = String(Number(startTime.slice(0, 2)) + 2).padStart(2, "0");
    void onSubmit({ docenteId: teacherId, aulaId: selectedRoom.id, inicio: `${date}T${startTime}:00-05:00`, fin: `${date}T${endHour}:00:00-05:00`, motivo: reason.trim() || undefined });
  };

  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="loan-dialog-title"><header><div><span>Nueva reserva académica</span><h2 id="loan-dialog-title">Solicitud de préstamo docente</h2><p>Seleccione el docente, el bloque y una de las aulas disponibles.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}>
    <fieldset className={styles.formSection}><legend><b>1</b> Docente y actividad</legend><div className={styles.formGrid}><label className={styles.wideField}><span>Docente responsable</span><select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">Seleccione docente</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label className={styles.wideField}><span>Motivo de la solicitud <small>Opcional · {reason.length}/500</small></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Ej. Taller complementario de la asignatura..." /></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>2</b> Bloque exacto de dos horas</legend><div className={styles.formGrid}><label><span>Fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label><span>Horario</span><select value={startTime} onChange={(event) => setStartTime(event.target.value)}>{["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((block) => <option key={block} value={block}>{block}–{String(Number(block.slice(0, 2)) + 2).padStart(2, "0")}:00</option>)}</select></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>3</b> Aula operativa <span>{suggestions.length} resultado(s)</span></legend><div className={styles.roomSuggestions}>{suggestions.slice(0, 10).map((room) => <button key={room.id} type="button" className={selectedRoomId === room.id ? styles.selectedRoom : ""} onClick={() => setSelectedRoomId(room.id)}><strong>{room.code}</strong><span>{room.capacity} puestos · Piso {room.floor}</span><small>{room.location}</small></button>)}{suggestions.length === 0 && <p className={styles.noSuggestions}>No hay aulas operativas registradas.</p>}</div></fieldset>
    <div className={styles.validationSummary}><span className={teacher ? styles.checkOk : ""}>{teacher ? "✓" : "1"} Docente válido</span><span className={selectedRoom ? styles.checkOk : ""}>{selectedRoom ? "✓" : "2"} Aula seleccionada</span><span className={styles.checkOk}>✓ Bloque de 2 h</span></div>
    <aside className={styles.approvalHint}><strong>La solicitud quedará pendiente.</strong> La aprobación posterior vuelve a validar la disponibilidad y los cruces del aula.</aside>
    <footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!teacher || !selectedRoom}>Crear solicitud →</button></footer>
  </form></section></div>;
}
