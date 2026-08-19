"use client";

import { useState } from "react";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const blocks = ["07:00 - 09:00", "09:00 - 11:00", "11:00 - 13:00", "14:00 - 16:00", "16:00 - 18:00"];

const classes: Record<string, { subject: string; teacher: string; tone: string }> = {
  "07:00 - 09:00-Lunes": { subject: "Resistencia de materiales", teacher: "Dr. Carlos Mendoza", tone: "info" },
  "07:00 - 09:00-Martes": { subject: "Cálculo diferencial", teacher: "Mg. Patricia Silva", tone: "success" },
  "07:00 - 09:00-Viernes": { subject: "Laboratorio de materiales", teacher: "Ing. Ana Suárez", tone: "success" },
  "09:00 - 11:00-Miércoles": { subject: "Física I", teacher: "Dr. Roberto Herrera", tone: "success" },
  "14:00 - 16:00-Jueves": { subject: "Resistencia de materiales", teacher: "Dr. Carlos Mendoza", tone: "warning" },
};

export function ScheduleView() {
  const [room, setRoom] = useState("401");
  const [week, setWeek] = useState("2026-W34");

  return (
    <>
      <section className="page-heading"><div><h1>Horarios académicos</h1><p>Vista semanal de la programación por aula · Período 2026-1.</p></div><span className="live-status">Periodo activo</span></section>
      <section className="filters" aria-label="Filtros de horario">
        <label className="field">Aula<select value={room} onChange={(event) => setRoom(event.target.value)}>{["401", "402", "403", "404", "405"].map((number) => <option key={number} value={number}>Aula {number}</option>)}</select></label>
        <label className="field">Semana<input type="week" value={week} onChange={(event) => setWeek(event.target.value)} /></label>
        <button className="button-primary" type="button">+ Agregar clase</button>
      </section>
      <section className="card"><header className="card-header"><div><h2>Aula {room} · Horario semanal</h2><p>La información se importará desde el archivo oficial de horarios.</p></div><span>Semana {week.slice(-2)}</span></header>
        <div className="table-wrap"><table className="schedule"><thead><tr><th>Bloque</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead><tbody>
          {blocks.map((block) => <tr key={block}><td>{block}</td>{days.map((day) => {
            const entry = room === "401" ? classes[`${block}-${day}`] : undefined;
            return <td key={day}><div className={`schedule-slot ${entry ? `schedule-${entry.tone}` : "free"}`}><strong>{entry?.subject ?? "Libre"}</strong><span>{entry?.teacher ?? "Sin actividad programada"}</span></div></td>;
          })}</tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}
