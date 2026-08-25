"use client";

import Link from "next/link";
import { audiovisualEquipment } from "@/features/audiovisuales/data/audiovisuals";
import { availabilityRooms, getAvailabilityForBlock } from "@/features/disponibilidad/data/availability";
import { initialPractices } from "@/features/practicas-libres/data/practices";
import styles from "./DashboardView.module.css";

type ScheduleStatus = "EN_CLASE" | "RESERVADA" | "PENDIENTE" | "AUSENTE";
type AlertSeverity = "info" | "advertencia" | "critica";

const currentSchedule: Array<{ room: string; subject: string; teacher: string; group: string; status: ScheduleStatus }> = [
  { room: "401", subject: "Resistencia de Materiales", teacher: "Dr. Carlos Mendoza", group: "Grupo 01", status: "PENDIENTE" },
  { room: "403", subject: "Estadística Aplicada", teacher: "Dra. María Torres", group: "Préstamo docente", status: "RESERVADA" },
  { room: "502", subject: "Diseño Gráfico Digital", teacher: "Dis. Paula Ríos", group: "Grupo 02", status: "EN_CLASE" },
  { room: "505", subject: "Ciencia de Datos", teacher: "Dr. Felipe Gómez", group: "Grupo 01", status: "EN_CLASE" },
  { room: "601", subject: "Análisis Estructural", teacher: "Mg. Roberto Castro", group: "Grupo 04", status: "AUSENTE" },
];

const alerts: Array<{ id: string; severity: AlertSeverity; type: string; message: string; room?: string; action: string; href: string }> = [
  { id: "absence-601", severity: "critica", type: "Ausencia docente", message: "Se registró ausencia docente para la clase del Aula 601.", room: "601", action: "Revisar horario", href: "/horarios" },
  { id: "maintenance-406", severity: "advertencia", type: "Mantenimiento", message: "El Aula 406 no está disponible por mantenimiento del sistema eléctrico.", room: "406", action: "Ver aula", href: "/aulas?aula=406" },
  { id: "attendance-401", severity: "advertencia", type: "Asistencia pendiente", message: "La asistencia de la clase del Aula 401 aún no ha sido registrada.", room: "401", action: "Ver horario", href: "/horarios" },
  { id: "loan-403", severity: "info", type: "Préstamo programado", message: "Existe un préstamo docente aprobado para el Aula 403 en este bloque.", room: "403", action: "Ver préstamo", href: "/prestamos-docentes" },
];

const statusLabels: Record<ScheduleStatus, string> = { EN_CLASE: "En clase", RESERVADA: "Reservada", PENDIENTE: "Pendiente", AUSENTE: "Ausente" };

export function DashboardView() {
  const availability = availabilityRooms.map((room) => getAvailabilityForBlock(room, "2026-08-25", "08:00"));
  const available = availability.filter((item) => item.calculatedState === "disponible").length;
  const occupied = availability.filter((item) => item.calculatedState === "ocupada").length;
  const activePractices = initialPractices.filter((item) => item.status === "ACTIVO" || item.status === "VENCIDO").length;
  const equipmentOnLoan = audiovisualEquipment.filter((item) => item.status === "PRESTADO").length;

  return <>
    <section className={`page-heading ${styles.heading}`}><div><span className={styles.kicker}>Operación en tiempo real</span><h1>Panel de Control Operativo</h1><p>Semestre 2026-3 · Martes, 25 de agosto · Bloque actual 08:00–10:00</p></div><span className={styles.live}><i />Actualización en tiempo real</span></section>
    <div className={styles.dashboardLayout}>
      <div className={styles.mainColumn}>
        <section className={styles.metrics} aria-label="Indicadores del bloque actual">
          <Metric label="Aulas disponibles" value={available} detail={`de ${availability.length} aulas`} tone="green" />
          <Metric label="Clases en curso" value={occupied} detail="bloque actual" tone="blue" />
          <Metric label="Prácticas libres" value={activePractices} detail="activas o vencidas" tone="violet" />
          <Metric label="Audiovisuales prestados" value={equipmentOnLoan} detail={`de ${audiovisualEquipment.length} equipos`} tone="amber" />
        </section>
        <section className={styles.scheduleCard}><header><div><h2>Horario actual — Bloque 08:00</h2><p>Clases y actividades académicas del bloque en curso.</p></div><span>08:00–10:00</span></header><div className="table-wrap"><table><thead><tr><th>Hora</th><th>Aula</th><th>Asignatura / actividad</th><th>Docente</th><th>Grupo</th><th>Estado</th></tr></thead><tbody>{currentSchedule.map((item) => <tr key={`${item.room}-${item.subject}`}><td><code>08:00–10:00</code></td><td><Link href={`/aulas?aula=${item.room}`}>{item.room}</Link></td><td><strong>{item.subject}</strong></td><td>{item.teacher}</td><td><span>{item.group}</span></td><td><StatusBadge status={item.status} /></td></tr>)}</tbody></table></div><footer><span>{currentSchedule.length} actividades en el bloque</span><Link href="/horarios">Ver horario completo →</Link></footer></section>
        <section className={styles.roomSummary}><header><div><h2>Estado consolidado de aulas</h2><p>Resultado calculado; no se persiste como tabla independiente.</p></div><Link href="/disponibilidad">Abrir disponibilidad</Link></header><div>{(["disponible", "ocupada", "reservada", "mantenimiento", "bloqueada"] as const).map((state) => <article key={state}><i className={styles[`state_${state}`]} /><strong>{availability.filter((item) => item.calculatedState === state).length}</strong><span>{state[0].toLocaleUpperCase("es") + state.slice(1)}</span></article>)}</div></section>
      </div>
      <aside className={styles.operationalPanel}><header><div><p>{alerts.length} alertas calculadas</p></div><span>Solo lectura</span></header><div className={styles.alertStats}><span><strong>{alerts.filter((item) => item.severity === "critica").length}</strong>Críticas</span><span><strong>{alerts.filter((item) => item.severity === "advertencia").length}</strong>Advertencias</span><span><strong>{alerts.filter((item) => item.severity === "info").length}</strong>Informativas</span></div><div className={styles.alertList}>{alerts.map((alert) => <article key={alert.id} className={styles[`alert_${alert.severity}`]}><header><span>{alert.severity}</span><b>{alert.type}</b></header><p>{alert.message}</p>{alert.room && <small>Aula {alert.room}</small>}<Link href={alert.href}>{alert.action} →</Link></article>)}</div><footer><span>Calculado 25 ago · 08:30</span><b>persistido: false</b></footer></aside>
    </div>
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><strong>{value}</strong><span>{detail}</span><b>{label}</b></article>;
}
function StatusBadge({ status }: { status: ScheduleStatus }) {
  return <span className={`${styles.status} ${styles[`status_${status.toLocaleLowerCase()}`]}`}><i />{statusLabels[status]}</span>;
}
