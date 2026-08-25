"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  availabilityRooms,
  getAvailabilityForBlock,
  getEndTime,
  operatingBlocks,
} from "@/features/disponibilidad/data/availability";
import { initialPractices, practiceStudents } from "@/features/practicas-libres/data/practices";
import type { FreePractice, FreePracticeStatus, PracticeStudent } from "@/features/practicas-libres/types";
import styles from "./FreePracticesView.module.css";

type PracticeView = "activas" | "historial";

const statusLabels: Record<FreePracticeStatus, string> = {
  ACTIVO: "Activa",
  DEVUELTO: "Finalizada",
  CANCELADO: "Cancelada",
  VENCIDO: "Vencida",
};

const referenceTime = new Date("2026-08-25T08:30:00-05:00");

export function FreePracticesView() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("aula") ?? "";
  const [practices, setPractices] = useState(initialPractices);
  const [view, setView] = useState<PracticeView>("activas");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [showRegister, setShowRegister] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activePractices = practices.filter((practice) => practice.status === "ACTIVO" || practice.status === "VENCIDO");
  const completedPractices = practices.filter((practice) => practice.status === "DEVUELTO" || practice.status === "CANCELADO");
  const visiblePractices = useMemo(() => {
    const source = view === "activas" ? activePractices : completedPractices;
    const normalized = query.trim().toLocaleLowerCase("es");
    return source.filter((practice) =>
      (roomFilter === "todas" || practice.roomCode === roomFilter) &&
      (!normalized || `${practice.student.name} ${practice.student.code} ${practice.roomCode} ${practice.id}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [activePractices, completedPractices, query, roomFilter, view]);

  const finishPractice = (practice: FreePractice) => {
    setPractices((current) => current.map((item) => item.id === practice.id ? { ...item, status: "DEVUELTO", actualEnd: "2026-08-25T08:30:00-05:00" } : item));
    setNotice(`${practice.id} finalizada correctamente${practice.status === "VENCIDO" ? " como devolución tardía" : ""}.`);
  };

  const cancelPractice = (practice: FreePractice) => {
    if (practice.status !== "ACTIVO") return;
    setPractices((current) => current.map((item) => item.id === practice.id ? { ...item, status: "CANCELADO", actualEnd: "2026-08-25T08:30:00-05:00" } : item));
    setNotice(`${practice.id} cancelada. El aula fue liberada.`);
  };

  const registerPractice = (payload: Omit<FreePractice, "id" | "status">) => {
    const nextId = `PL-2026-${String(145 + practices.length).padStart(4, "0")}`;
    setPractices((current) => [{ ...payload, id: nextId, status: "ACTIVO" }, ...current]);
    setShowRegister(false);
    setView("activas");
    setNotice(`${nextId} registrada para ${payload.student.name} en el Aula ${payload.roomCode}.`);
  };

  return <>
    <section className={`page-heading ${styles.heading}`}>
      <div><h1>Prácticas Libres</h1><p>Registro y control del uso libre de las aulas de software.</p></div>
      <button type="button" className="button-primary" onClick={() => setShowRegister(true)}>+ Nueva práctica libre</button>
    </section>

    <section className={styles.metrics} aria-label="Resumen de prácticas libres">
      <Metric label="En curso" value={activePractices.filter((item) => item.status === "ACTIVO").length} detail="Dentro del tiempo estimado" tone="green" />
      <Metric label="Vencidas" value={activePractices.filter((item) => item.status === "VENCIDO").length} detail="Requieren devolución" tone="red" />
      <Metric label="Aulas utilizadas" value={new Set(activePractices.map((item) => item.roomId)).size} detail="Ocupación por práctica libre" tone="blue" />
      <Metric label="Finalizadas" value={completedPractices.filter((item) => item.status === "DEVUELTO").length} detail="En el historial mostrado" tone="neutral" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <section className={styles.contentCard}>
      <header className={styles.cardHeader}>
        <div className={styles.tabs} role="tablist" aria-label="Estado de las prácticas">
          <button type="button" role="tab" aria-selected={view === "activas"} className={view === "activas" ? styles.activeTab : ""} onClick={() => setView("activas")}>Activas ahora <span>{activePractices.length}</span></button>
          <button type="button" role="tab" aria-selected={view === "historial"} className={view === "historial" ? styles.activeTab : ""} onClick={() => setView("historial")}>Historial <span>{completedPractices.length}</span></button>
        </div>
        <div className={styles.liveIndicator}><i />{view === "activas" ? `${activePractices.length} estudiantes utilizando aulas` : "Registros finalizados o cancelados"}</div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar estudiante, código, aula o registro..." aria-label="Buscar prácticas libres" /></label>
        <label><span>Aula</span><select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="todas">Todas las aulas</option>{availabilityRooms.map((room) => <option key={room.id} value={room.code}>Aula {room.code}</option>)}</select></label>
        <span className={styles.resultCount}>{visiblePractices.length} resultado(s)</span>
      </div>

      <div className="table-wrap"><table className={styles.practiceTable}><thead><tr><th>Estudiante</th><th>Código</th><th>Aula</th><th>Entrada</th><th>Salida estimada</th><th>Tiempo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {visiblePractices.map((practice) => <PracticeRow key={practice.id} practice={practice} onFinish={() => finishPractice(practice)} onCancel={() => cancelPractice(practice)} />)}
        {visiblePractices.length === 0 && <tr><td colSpan={8} className={styles.emptyTable}>No hay prácticas para los filtros seleccionados.</td></tr>}
      </tbody></table></div>
    </section>


    {showRegister && <RegisterPracticeDialog initialRoom={initialRoom} onClose={() => setShowRegister(false)} onSubmit={registerPractice} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function PracticeRow({ practice, onFinish, onCancel }: { practice: FreePractice; onFinish: () => void; onCancel: () => void }) {
  const start = new Date(practice.start);
  const end = new Date(practice.estimatedEnd);
  const actual = practice.actualEnd ? new Date(practice.actualEnd) : referenceTime;
  const duration = end.getTime() - start.getTime();
  const elapsed = Math.max(0, actual.getTime() - start.getTime());
  const progress = Math.min(100, (elapsed / duration) * 100);
  return <tr><td><strong>{practice.student.name}</strong><small>{practice.id}</small></td><td><code>{practice.student.code}</code></td><td><b className={styles.roomCode}>{practice.roomCode}</b></td><td><TimeValue value={practice.start} /></td><td><TimeValue value={practice.estimatedEnd} /></td><td><div className={styles.progressText}><span>{practice.status === "DEVUELTO" ? "Completada" : practice.status === "CANCELADO" ? "Cancelada" : `${Math.round(progress)}% del bloque`}</span><i><b style={{ width: `${progress}%` }} className={practice.status === "VENCIDO" ? styles.progressDanger : ""} /></i></div></td><td><StatusBadge status={practice.status} /></td><td><div className={styles.actions}>{(practice.status === "ACTIVO" || practice.status === "VENCIDO") && <button type="button" className={styles.finishButton} onClick={onFinish}>Finalizar</button>}{practice.status === "ACTIVO" && <button type="button" className={styles.cancelButton} onClick={onCancel}>Cancelar</button>} {(practice.status === "DEVUELTO" || practice.status === "CANCELADO") && <span>—</span>}</div></td></tr>;
}

function TimeValue({ value }: { value: string }) {
  const date = new Date(value);
  return <span className={styles.timeValue}>{new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(date)}<small>{new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" }).format(date)}</small></span>;
}

function StatusBadge({ status }: { status: FreePracticeStatus }) {
  return <span className={`${styles.status} ${styles[`status_${status.toLocaleLowerCase()}`]}`}><i />{statusLabels[status]}</span>;
}

function RegisterPracticeDialog({ initialRoom, onClose, onSubmit }: { initialRoom: string; onClose: () => void; onSubmit: (payload: Omit<FreePractice, "id" | "status">) => void }) {
  const [studentCode, setStudentCode] = useState("");
  const [student, setStudent] = useState<PracticeStudent | null>(null);
  const [studentMissing, setStudentMissing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("2026-08-25");
  const [startTime, setStartTime] = useState("10:00");
  const [softwareId, setSoftwareId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(initialRoom);
  const softwareOptions = [...new Map(availabilityRooms.flatMap((room) => room.software).map((software) => [software.id, software])).values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const suggestions = availabilityRooms
    .map((room) => getAvailabilityForBlock(room, date, startTime))
    .filter((result) => result.calculatedState === "disponible" && (!softwareId || result.room.software.some((software) => software.id === softwareId)))
    .sort((a, b) => a.room.capacity - b.room.capacity || a.room.code.localeCompare(b.room.code));
  const selectedResult = suggestions.find((result) => result.room.code === selectedRoom);

  const lookupStudent = () => {
    const found = practiceStudents.find((item) => item.code === studentCode.trim());
    setStudent(found ?? null);
    setStudentMissing(!found);
    if (found) { setName(found.name); setEmail(found.email ?? ""); }
  };
  const changeCode = (value: string) => { setStudentCode(value); setStudent(null); setStudentMissing(false); setName(""); setEmail(""); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedResult || student?.activeFine) return;
    const practiceStudent: PracticeStudent = student ?? { id: `student-${studentCode}`, code: studentCode.trim(), name: name.trim(), email: email.trim() || undefined, activeFine: false };
    onSubmit({ student: practiceStudent, roomId: selectedResult.room.id, roomCode: selectedResult.room.code, start: `${date}T${startTime}:00-05:00`, estimatedEnd: `${date}T${getEndTime(startTime)}:00-05:00` });
  };

  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="practice-dialog-title"><header><div><span>Registro operativo</span><h2 id="practice-dialog-title">Nueva práctica libre</h2><p>El sistema valida estudiante, bloque y disponibilidad del aula.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}>
    <fieldset className={styles.formSection}><legend><b>1</b> Identificación del estudiante</legend><div className={styles.studentLookup}><label><span>Código estudiantil</span><input value={studentCode} onChange={(event) => changeCode(event.target.value)} minLength={3} maxLength={30} placeholder="Ej. 2022143021" required autoFocus /></label><button type="button" onClick={lookupStudent} disabled={studentCode.trim().length < 3}>Buscar estudiante</button></div>{student && <div className={`${styles.studentResult} ${student.activeFine ? styles.studentBlocked : styles.studentValid}`}><span>{student.activeFine ? "!" : "✓"}</span><div><strong>{student.name}</strong><small>{student.email}</small><p>{student.activeFine ? "Tiene una multa activa y no puede registrar prácticas libres." : "Estudiante encontrado y habilitado para el registro."}</p></div></div>}{studentMissing && <div className={styles.newStudent}><p>No existe un estudiante con este código. Complete los datos para crearlo durante el registro.</p><div><label><span>Nombre completo</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={120} required /></label><label><span>Correo institucional (opcional)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={160} /></label></div></div>}</fieldset>
    <fieldset className={styles.formSection}><legend><b>2</b> Bloque de dos horas</legend><div className={styles.formGrid}><label><span>Fecha</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelectedRoom(""); }} required /></label><label><span>Hora de entrada</span><select value={startTime} onChange={(event) => { setStartTime(event.target.value); setSelectedRoom(""); }}>{operatingBlocks.map((block) => <option key={block} value={block}>{block}–{getEndTime(block)}</option>)}</select></label><label className={styles.wideField}><span>Software para filtrar aulas</span><select value={softwareId} onChange={(event) => { setSoftwareId(event.target.value); setSelectedRoom(""); }}><option value="">Sin requisito de software</option>{softwareOptions.map((software) => <option key={software.id} value={software.id}>{software.name}</option>)}</select><small>Este dato se usa para sugerir el aula; el contrato actual no lo almacena en la práctica.</small></label></div></fieldset>
    <fieldset className={styles.formSection}><legend><b>3</b> Aula disponible <span>{suggestions.length} sugerencia(s)</span></legend><div className={styles.roomSuggestions}>{suggestions.slice(0, 8).map((result) => <button key={result.room.id} type="button" className={selectedRoom === result.room.code ? styles.selectedRoom : ""} onClick={() => setSelectedRoom(result.room.code)}><strong>{result.room.code}</strong><span>{result.room.capacity} puestos · Piso {result.room.floor}</span><small>{result.room.software.slice(0, 2).map((software) => software.name).join(" · ")}</small></button>)}{suggestions.length === 0 && <p className={styles.noSuggestions}>No hay aulas disponibles para este bloque y requisito de software.</p>}</div></fieldset>
    <div className={styles.validationSummary}><span className={student && !student.activeFine || studentMissing ? styles.checkOk : ""}>{student && !student.activeFine || studentMissing ? "✓" : "1"} Estudiante</span><span className={selectedResult ? styles.checkOk : ""}>{selectedResult ? "✓" : "2"} Aula disponible</span><span className={styles.checkOk}>✓ Bloque exacto de 2 h</span></div>
    <footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={(!student && !studentMissing) || Boolean(student?.activeFine) || !name.trim() || !selectedResult}>Registrar práctica →</button></footer>
  </form></section></div>;
}

