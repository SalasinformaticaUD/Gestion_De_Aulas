"use client";

import { useEffect, useId, useState } from "react";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { crearPeriodo, importarClase, listarClases, listarPeriodos, type Periodo } from "@/features/horarios/api/horariosApi";
import styles from "./ScheduleView.module.css";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const blocks = ["06:00 - 08:00", "08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00"];
const tones = [
  { value: "info", label: "Informativa" },
  { value: "success", label: "Confirmada" },
  { value: "warning", label: "En alerta" },
] as const;

type ClassEntry = { subject: string; teacher: string; tone: string };
type ClassMap = Record<string, ClassEntry>;

const initialClasses: ClassMap = {};
const dayNumbers: Record<string, number> = { Lunes: 1, Martes: 2, "Miércoles": 3, Jueves: 4, Viernes: 5, Sábado: 6 };

function slotKey(block: string, day: string, room: string) {
  return `${block}-${day}-${room}`;
}

export function ScheduleView() {
  const [room, setRoom] = useState("");
  const [rooms, setRooms] = useState<string[]>([]);
  const [roomIds, setRoomIds] = useState<Record<string, string>>({});
  const [periodoId, setPeriodoId] = useState("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [week, setWeek] = useState("");
  const [classes, setClasses] = useState<ClassMap>(initialClasses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void Promise.all([listarAulas(), listarPeriodos()]).then(([aulas, loadedPeriods]) => { const codes = aulas.map((aula) => aula.code); setRooms(codes); setRoomIds(Object.fromEntries(aulas.map((aula) => [aula.code, aula.id]))); setRoom((current) => current || codes[0] || ""); setPeriodos(loadedPeriods); setPeriodoId((loadedPeriods.find((periodo) => periodo.activo) ?? loadedPeriods[0])?.id ?? ""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "No fue posible cargar las aulas o períodos.")); }, []);
  const periodo = periodos.find((item) => item.id === periodoId);
  const loadClasses = async () => { if (!periodoId) return; try { const data = await listarClases(periodoId); const mapped: ClassMap = {}; data.forEach((item) => { const day = days[item.diaSemana - 1]; const start = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(item.horaInicio)); const end = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(item.horaFin)); const code = Object.entries(roomIds).find(([, id]) => id === item.aulaId)?.[0]; if (day && code) mapped[slotKey(`${start} - ${end}`, day, code)] = { subject: item.asignatura.nombre, teacher: item.docente.nombre, tone: "info" }; }); setClasses(mapped); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar clases."); } };
  // La recarga depende del período y del catálogo de aulas; loadClasses se recrea por render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadClasses(); }, [periodoId, roomIds]);

  return (
    <>
      <section className="page-heading"><div><h1>Horarios académicos</h1><p>Vista semanal de la programación por aula · {periodo ? `Período ${periodo.nombre}` : "Seleccione un período académico"}.</p></div><span className="live-status">{periodo ? (periodo.activo ? "Período activo" : "Período seleccionado") : "Sin período"}</span></section>
      <section className="filters" aria-label="Filtros de horario">
        <label className="field">Aula<select value={room} onChange={(event) => setRoom(event.target.value)}><option value="">{rooms.length ? "Seleccionar aula" : "Sin aulas registradas"}</option>{rooms.map((number) => <option key={number} value={number}>Aula {number}</option>)}</select></label>
        <label className="field">Período<select value={periodoId} onChange={(event) => setPeriodoId(event.target.value)}><option value="">{periodos.length ? "Seleccionar período" : "No hay períodos creados"}</option>{periodos.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.activo ? " · Activo" : ""}</option>)}</select></label>
        <label className="field">Semana<input type="week" value={week} onChange={(event) => setWeek(event.target.value)} /></label>
        <button className="button-secondary" type="button" onClick={() => setIsPeriodModalOpen(true)}>+ Crear período</button>
        <button className="button-primary" type="button" onClick={() => setIsModalOpen(true)} disabled={!periodoId || !room}>+ Agregar clase</button>
      </section>
      {error && <p className="auth-feedback auth-feedback-error">{error}</p>}
      <section className="card"><header className="card-header"><div><h2>{room ? `Aula ${room} · Horario semanal` : "Horario semanal"}</h2><p>{rooms.length ? "Programación semanal del aula seleccionada." : "No hay aulas registradas."}</p></div><span>{week ? `Semana ${week.slice(-2)}` : "Sin período"}</span></header>
        <div className="table-wrap"><table className="schedule"><thead><tr><th>Bloque</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>
          {blocks.map((block) => <tr key={block}><td>{block}</td>{days.map((day) => {
            const entry = classes[slotKey(block, day, room)];
            return <td key={day}><div className={`schedule-slot ${entry ? `schedule-${entry.tone}` : "free"}`}><strong>{entry?.subject ?? "Libre"}</strong><span>{entry?.teacher ?? "Sin actividad programada"}</span></div></td>;
          })}</tr>)}
        </tbody></table></div>
      </section>
      {isModalOpen && (
        <AddClassModal
          defaultRoom={room} rooms={rooms}
          onClose={() => setIsModalOpen(false)}
          onCreate={async (key, entry, data) => { try { if (!periodoId || !roomIds[data.room]) throw new Error("Debe existir un período académico y un aula registrada."); await importarClase({ periodoId, aulaId: roomIds[data.room], diaSemana: dayNumbers[data.day], horaInicio: data.block.slice(0, 5), horaFin: data.block.slice(-5), docenteNombre: data.teacher, docenteDocumento: data.document, asignaturaNombre: data.subject, asignaturaCodigo: data.subjectCode }); await loadClasses(); setIsModalOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible crear la clase."); } }}
          isOccupied={(key) => Boolean(classes[key])}
        />
      )}
      {isPeriodModalOpen && (
        <PeriodModal
          onClose={() => setIsPeriodModalOpen(false)}
          onCreate={async (input) => {
            try {
              const created = await crearPeriodo(input);
              const loadedPeriods = await listarPeriodos();
              setPeriodos(loadedPeriods);
              setPeriodoId(created.id);
              setIsPeriodModalOpen(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "No fue posible crear el período.");
            }
          }}
        />
      )}
    </>
  );
}

function AddClassModal({
  defaultRoom,
  rooms,
  onClose,
  onCreate,
  isOccupied,
}: {
  defaultRoom: string;
  rooms: string[];
  onClose: () => void;
  onCreate: (key: string, entry: ClassEntry, data: { room: string; day: string; block: string; subject: string; teacher: string; document: string; subjectCode: string }) => Promise<void>;
  isOccupied: (key: string) => boolean;
}) {
  const titleId = useId();
  const [targetRoom, setTargetRoom] = useState(defaultRoom);
  const [day, setDay] = useState(days[0]);
  const [block, setBlock] = useState(blocks[0]);
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [document, setDocument] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]["value"]>("info");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const key = slotKey(block, day, targetRoom);
  const conflict = isOccupied(key);
  const canSubmit = Boolean(targetRoom) && subject.trim().length > 0 && subjectCode.trim().length > 0 && teacher.trim().length > 0 && document.trim().length > 0 && !conflict;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    void onCreate(key, { subject: subject.trim(), teacher: teacher.trim(), tone }, { room: targetRoom, day, block, subject: subject.trim(), teacher: teacher.trim(), document: document.trim(), subjectCode: subjectCode.trim() });
  };

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.modalHeader}>
          <div>
            <h2 id={titleId}>Agregar clase</h2>
            <p>Programe una nueva actividad dentro del horario semanal.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.row}>
            <label className={styles.field}>Aula
              <select value={targetRoom} onChange={(event) => setTargetRoom(event.target.value)}>
                <option value="">Seleccionar aula</option>{rooms.map((number) => <option key={number} value={number}>Aula {number}</option>)}
              </select>
            </label>
            <label className={styles.field}>Día
              <select value={day} onChange={(event) => setDay(event.target.value)}>
                {days.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className={styles.field}>Bloque horario
            <select value={block} onChange={(event) => setBlock(event.target.value)}>
              {blocks.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className={styles.field}>Asignatura o actividad
            <input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej. Resistencia de materiales" required />
          </label>
          <label className={styles.field}>Código de asignatura
            <input type="text" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} placeholder="Ej. MAT-101" required />
          </label>
          <label className={styles.field}>Docente responsable
            <input type="text" value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Ej. Dr. Carlos Mendoza" required />
          </label>
          <label className={styles.field}>Documento del docente
            <input type="text" value={document} onChange={(event) => setDocument(event.target.value)} placeholder="Ej. 12345678" required />
          </label>
          <label className={styles.field}>Estado de la clase
            <select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}>
              {tones.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {conflict ? (
            <p className={styles.conflict} role="alert">Ya existe una clase en Aula {targetRoom}, {day}, {block}. Elija otro bloque, día o aula.</p>
          ) : (
            <p className={styles.hint}>Seleccione un aula registrada y uno de los bloques operativos de dos horas.</p>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button type="submit" className="button-primary" disabled={!canSubmit}>Agregar clase</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PeriodModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: { nombre: string; fechaInicio: string; fechaFin: string; activo: boolean }) => Promise<void> }) {
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const canSubmit = Boolean(nombre.trim() && fechaInicio && fechaFin && fechaInicio <= fechaFin);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.modalHeader}>
          <div><h2 id={titleId}>Crear período académico</h2><p>Se seleccionará para todo el horario; no se solicita al crear cada clase.</p></div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); if (canSubmit) void onCreate({ nombre: nombre.trim(), fechaInicio, fechaFin, activo: true }); }}>
          <label className={styles.field}>Nombre del período<input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. 2026-2" required /></label>
          <div className={styles.row}>
            <label className={styles.field}>Fecha de inicio<input type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} required /></label>
            <label className={styles.field}>Fecha de finalización<input type="date" value={fechaFin} min={fechaInicio} onChange={(event) => setFechaFin(event.target.value)} required /></label>
          </div>
          {fechaInicio && fechaFin && fechaInicio > fechaFin && <p className={styles.conflict}>La fecha de finalización no puede ser anterior a la de inicio.</p>}
          <p className={styles.hint}>El período se crea activo y queda seleccionado de forma general en esta pantalla.</p>
          <div className={styles.actions}><button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!canSubmit}>Crear y seleccionar</button></div>
        </form>
      </div>
    </div>
  );
}
