"use client";

import { useEffect, useMemo, useState } from "react";
import { listarDocentes, type DocenteCatalogo } from "@/features/catalogos/api/catalogosApi";
import { consultarDisponibilidad, type DisponibilidadApi } from "@/features/disponibilidad/api/disponibilidadApi";
import { cargarSoftware } from "@/features/software/api/softwareApi";
import type { InstalledSoftware } from "@/features/software/types";
import { aprobarPrestamoDocente, cancelarPrestamoDocente, crearPrestamoDocente, finalizarPrestamoDocente, listarPrestamosDocentes } from "@/features/prestamos-docentes/api/prestamosDocentesApi";
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
  const [teachers, setTeachers] = useState<DocenteCatalogo[]>([]);
  const [software, setSoftware] = useState<InstalledSoftware[]>([]);
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

  const reload = async () => { try { const [nextLoans, nextTeachers, nextSoftware] = await Promise.all([listarPrestamosDocentes(), listarDocentes(), cargarSoftware()]); setLoans(nextLoans); setTeachers(nextTeachers); setSoftware([{ id: "NINGUNO", name: "Ninguno", version: "", status: "ACTIVO" }, ...nextSoftware.software]); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible cargar préstamos." }); } };
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

  const createLoan = async (payload: { docenteId?: string; docenteNuevoNombre?: string; docenteNuevoDocumento?: string; aulaId: string; softwareId?: string; inicio: string; fin: string; motivo?: string }) => {
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

    

    {showRequest && <RequestLoanDialog teachers={teachers} software={software} onClose={() => setShowRequest(false)} onSubmit={createLoan} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function LoanRow({ loan, onApprove, onCancel, onFinish }: { loan: TeacherLoan; onApprove: () => void; onCancel: () => void; onFinish: () => void }) {
  const date = new Date(loan.start);
  const formatTime = (value: string) => new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
  return <tr>
    <td><strong className={styles.loanId}>{loan.id}</strong><small>Encargado: {loan.manager ?? "Sin encargado registrado"}</small></td>
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

function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()); }
function availableBlocks(date: string) { const blocks = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"]; if (date !== today()) return blocks; const now = new Date(); return blocks.filter((block) => new Date(`${date}T${String(Number(block.slice(0, 2)) + 2).padStart(2, "0")}:00-05:00`).getTime() - now.getTime() >= 30 * 60 * 1000); }

function RequestLoanDialog({ teachers, software, onClose, onSubmit }: { teachers: DocenteCatalogo[]; software: InstalledSoftware[]; onClose: () => void; onSubmit: (payload: { docenteId?: string; docenteNuevoNombre?: string; docenteNuevoDocumento?: string; aulaId: string; softwareId?: string; inicio: string; fin: string; motivo?: string }) => void | Promise<void> }) {
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? ""); const [document, setDocument] = useState(""); const [documentError, setDocumentError] = useState<string | null>(null); const [otherTeacher, setOtherTeacher] = useState(false); const [otherName, setOtherName] = useState(""); const [otherDocument, setOtherDocument] = useState("");
  const [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()));
  const [startTime, setStartTime] = useState(() => availableBlocks(today())[0] ?? "08:00");
  const [reason, setReason] = useState("");
  const [softwareId, setSoftwareId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [suggestions, setSuggestions] = useState<DisponibilidadApi[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const endTime = `${String(Number(startTime.slice(0, 2)) + 2).padStart(2, "0")}:00`;
  const availableLoanBlocks = availableBlocks(date);
  useEffect(() => { if (availableLoanBlocks.length && !availableLoanBlocks.includes(startTime)) setStartTime(availableLoanBlocks[0]); }, [availableLoanBlocks, startTime]);
  useEffect(() => {
    let active = true;
    setLoadingRooms(true);
    setRoomsError(null);
    setSelectedRoomId("");
    if (!softwareId) { setSuggestions([]); setLoadingRooms(false); return; }
    void consultarDisponibilidad(date, startTime, endTime, softwareId === "NINGUNO" ? undefined : softwareId).then((result) => {
      if (!active) return;
      setSuggestions(result.filter((item) => item.estadoCalculado.toLocaleLowerCase("es") === "disponible" && !item.fuentes.some((fuente) => fuente.tipo === "clase-programada")).sort((a, b) => a.aula.capacidad - b.aula.capacidad || a.aula.codigo.localeCompare(b.aula.codigo)));
    }).catch((error) => {
      if (active) setRoomsError(error instanceof Error ? error.message : "No fue posible consultar la disponibilidad de aulas.");
    }).finally(() => { if (active) setLoadingRooms(false); });
    return () => { active = false; };
  }, [date, endTime, softwareId, startTime]);
  const selectedRoom = suggestions.find((room) => room.aula.id === selectedRoomId);
  const teacher = teachers.find((item) => item.id === teacherId); const findTeacherByDocument = () => { const normalized = document.trim(); if (!/^\d{3,50}$/.test(normalized)) { setDocumentError("Ingrese una cédula numérica válida."); return; } const found = teachers.find((item) => item.documento?.trim() === normalized); if (!found) { setDocumentError("No existe un docente registrado con esa cédula."); return; } setTeacherId(found.id); setDocumentError(null); };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if ((!teacher && !otherTeacher) || !selectedRoom || !softwareId || (otherTeacher && (!otherName.trim() || !/^\d+$/.test(otherDocument)))) return;
    void onSubmit({ ...(otherTeacher ? { docenteNuevoNombre: otherName.trim(), docenteNuevoDocumento: otherDocument } : { docenteId: teacherId }), aulaId: selectedRoom.aula.id, ...(softwareId !== "NINGUNO" && { softwareId }), inicio: `${date}T${startTime}:00-05:00`, fin: `${date}T${endTime}:00-05:00`, motivo: reason.trim() || undefined });
  };

  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="loan-dialog-title"><header><div><span>Nueva reserva académica</span><h2 id="loan-dialog-title">Solicitud de préstamo docente</h2><p>Seleccione el docente, el bloque y una de las aulas disponibles.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}>
     <fieldset className={styles.formSection}><legend><b>1</b> Docente y actividad</legend><div className={styles.formGrid}><label className={styles.wideField}><span>Buscar por cédula</span><div className={styles.documentSearch}><input value={document} onChange={(event) => { setDocument(event.target.value); setDocumentError(null); }} inputMode="numeric" placeholder="Ingrese el número de documento" /><button type="button" onClick={findTeacherByDocument}>Buscar</button></div>{documentError && <small className={styles.documentError}>{documentError}</small>}</label><label className={styles.wideField}><span>Docente responsable</span><select value={otherTeacher ? "OTRO" : teacherId} onChange={(event) => { const value = event.target.value; setOtherTeacher(value === "OTRO"); setTeacherId(value === "OTRO" ? "" : value); const selected = teachers.find((item) => item.id === value); setDocument(selected?.documento ?? ""); setDocumentError(null); }}><option value="">Seleccione docente</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.nombre} · CC {item.documento ?? "Sin documento"}</option>)}<option value="OTRO">Otro profesor</option></select></label>{otherTeacher && <><label><span>Nombre del profesor</span><input value={otherName} onChange={(event) => setOtherName(event.target.value)} required /></label><label><span>Cédula</span><input value={otherDocument} onChange={(event) => setOtherDocument(event.target.value)} inputMode="numeric" required /></label></>}<label className={styles.wideField}><span>Motivo de la solicitud <small>Opcional · {reason.length}/500</small></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Ej. Taller complementario de la asignatura..." /></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>2</b> Software y bloque</legend><div className={styles.formGrid}><label className={styles.wideField}><span>Software requerido</span><select value={softwareId} onChange={(event) => setSoftwareId(event.target.value)} required><option value="">Seleccione software</option>{software.map((item) => <option key={item.id} value={item.id}>{item.name}{item.version ? ` · ${item.version}` : ""}</option>)}</select></label><label><span>Fecha</span><input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} required /></label><label><span>Horario</span><select value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={!availableLoanBlocks.length}>{availableLoanBlocks.map((block) => <option key={block} value={block}>{block}–{String(Number(block.slice(0, 2)) + 2).padStart(2, "0")}:00</option>)}</select></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>3</b> Aulas completamente libres <span>{loadingRooms ? "Consultando…" : `${suggestions.length} resultado(s)`}</span></legend><div className={styles.roomSuggestions}>{suggestions.slice(0, 10).map((room) => <button key={room.aula.id} type="button" className={selectedRoomId === room.aula.id ? styles.selectedRoom : ""} onClick={() => setSelectedRoomId(room.aula.id)}><strong>{room.aula.codigo}</strong><span>{room.aula.capacidad} puestos</span></button>)}{loadingRooms && <p className={styles.noSuggestions}>Consultando disponibilidad para la fecha y bloque seleccionados…</p>}{roomsError && <p className={styles.noSuggestions}>{roomsError}</p>}{!loadingRooms && !roomsError && suggestions.length === 0 && <p className={styles.noSuggestions}>{softwareId ? "No hay aulas completamente libres con ese software para la fecha y bloque." : "Seleccione el software requerido para consultar aulas."}</p>}</div></fieldset>
    <div className={styles.validationSummary}><span className={teacher ? styles.checkOk : ""}>{teacher ? "✓" : "1"} Docente válido</span><span className={selectedRoom ? styles.checkOk : ""}>{selectedRoom ? "✓" : "2"} Aula seleccionada</span><span className={styles.checkOk}>✓ Bloque de 2 h</span></div>
    <aside className={styles.approvalHint}><strong>La solicitud quedará pendiente.</strong> La aprobación posterior vuelve a validar la disponibilidad y los cruces del aula.</aside>
    <footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!teacher || !selectedRoom || !softwareId}>Crear solicitud →</button></footer>
  </form></section></div>;
}
