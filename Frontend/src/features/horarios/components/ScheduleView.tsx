"use client";

import { useEffect, useId, useState } from "react";
import styles from "./ScheduleView.module.css";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const blocks = ["07:00 - 09:00", "09:00 - 11:00", "11:00 - 13:00", "14:00 - 16:00", "16:00 - 18:00"];
const rooms: string[] = [];
const tones = [
  { value: "info", label: "Informativa" },
  { value: "success", label: "Confirmada" },
  { value: "warning", label: "En alerta" },
] as const;

type ClassEntry = { subject: string; teacher: string; tone: string };
type ClassMap = Record<string, ClassEntry>;

const initialClasses: ClassMap = {};

function slotKey(block: string, day: string, room: string) {
  return `${block}-${day}-${room}`;
}

export function ScheduleView() {
  const [room, setRoom] = useState("");
  const [week, setWeek] = useState("");
  const [classes, setClasses] = useState<ClassMap>(initialClasses);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="page-heading"><div><h1>Horarios académicos</h1><p>Vista semanal de la programación por aula · Período 2026-1.</p></div><span className="live-status">Periodo activo</span></section>
      <section className="filters" aria-label="Filtros de horario">
        <label className="field">Aula<select value={room} onChange={(event) => setRoom(event.target.value)}><option value="">Sin aulas registradas</option>{rooms.map((number) => <option key={number} value={number}>Aula {number}</option>)}</select></label>
        <label className="field">Semana<input type="week" value={week} onChange={(event) => setWeek(event.target.value)} /></label>
        <button className="button-primary" type="button" onClick={() => setIsModalOpen(true)}>+ Agregar clase</button>
      </section>
      <section className="card"><header className="card-header"><div><h2>{room ? `Aula ${room} · Horario semanal` : "Horario semanal"}</h2><p>No hay aulas ni actividades registradas.</p></div><span>{week ? `Semana ${week.slice(-2)}` : "Sin período"}</span></header>
        <div className="table-wrap"><table className="schedule"><thead><tr><th>Bloque</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>
          {blocks.map((block) => <tr key={block}><td>{block}</td>{days.map((day) => {
            const entry = classes[slotKey(block, day, room)];
            return <td key={day}><div className={`schedule-slot ${entry ? `schedule-${entry.tone}` : "free"}`}><strong>{entry?.subject ?? "Libre"}</strong><span>{entry?.teacher ?? "Sin actividad programada"}</span></div></td>;
          })}</tr>)}
        </tbody></table></div>
      </section>
      {isModalOpen && (
        <AddClassModal
          defaultRoom={room}
          onClose={() => setIsModalOpen(false)}
          onCreate={(key, entry) => {
            setClasses((current) => ({ ...current, [key]: entry }));
            setIsModalOpen(false);
          }}
          isOccupied={(key) => Boolean(classes[key])}
        />
      )}
    </>
  );
}

function AddClassModal({
  defaultRoom,
  onClose,
  onCreate,
  isOccupied,
}: {
  defaultRoom: string;
  onClose: () => void;
  onCreate: (key: string, entry: ClassEntry) => void;
  isOccupied: (key: string) => boolean;
}) {
  const titleId = useId();
  const [targetRoom, setTargetRoom] = useState(defaultRoom);
  const [day, setDay] = useState(days[0]);
  const [block, setBlock] = useState(blocks[0]);
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]["value"]>("info");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const key = slotKey(block, day, targetRoom);
  const conflict = isOccupied(key);
  const canSubmit = subject.trim().length > 0 && teacher.trim().length > 0 && !conflict;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onCreate(key, { subject: subject.trim(), teacher: teacher.trim(), tone });
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
                {rooms.map((number) => <option key={number} value={number}>Aula {number}</option>)}
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
          <label className={styles.field}>Docente responsable
            <input type="text" value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Ej. Dr. Carlos Mendoza" required />
          </label>
          <label className={styles.field}>Estado de la clase
            <select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}>
              {tones.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {conflict ? (
            <p className={styles.conflict} role="alert">Ya existe una clase en Aula {targetRoom}, {day}, {block}. Elija otro bloque, día o aula.</p>
          ) : (
            <p className={styles.hint}>Este registro se guarda solo en la sesión actual; aún no se conecta con la API de horarios.</p>
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
