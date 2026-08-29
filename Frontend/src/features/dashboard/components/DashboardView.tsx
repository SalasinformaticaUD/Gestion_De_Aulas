"use client";

import Link from "next/link";
import styles from "./DashboardView.module.css";

type ScheduleStatus = "EN_CLASE" | "RESERVADA" | "PENDIENTE" | "AUSENTE";
type AlertSeverity = "info" | "advertencia" | "critica";

const currentSchedule: Array<{ room: string; subject: string; teacher: string; group: string; status: ScheduleStatus }> = [];

const alerts: Array<{ id: string; severity: AlertSeverity; type: string; message: string; room?: string; action: string; href: string }> = [];

const statusLabels: Record<ScheduleStatus, string> = { EN_CLASE: "En clase", RESERVADA: "Reservada", PENDIENTE: "Pendiente", AUSENTE: "Ausente" };

export function DashboardView() {
  const availability: Array<{ calculatedState: "disponible" | "ocupada" | "reservada" | "mantenimiento" | "bloqueada" }> = [];
  const available = availability.filter((item) => item.calculatedState === "disponible").length;
  const occupied = availability.filter((item) => item.calculatedState === "ocupada").length;
  const activePractices = 0;
  const equipmentOnLoan = 0;

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Panel de Control Operativo</h1><p>No hay período ni actividades registradas.</p></div><span className={styles.live}><i />Sin actividad registrada</span></section>
    <div className={styles.dashboardLayout}>
      <div className={styles.mainColumn}>
        <section className={styles.metrics} aria-label="Indicadores del bloque actual">
          <Metric label="Aulas disponibles" value={available} detail={`de ${availability.length} aulas`} tone="green" />
          <Metric label="Clases en curso" value={occupied} detail="bloque actual" tone="blue" />
          <Metric label="Prácticas libres" value={activePractices} detail="activas o vencidas" tone="violet" />
          <Metric label="Audiovisuales prestados" value={equipmentOnLoan} detail="Sin registros" tone="amber" />
        </section>
        <section className={styles.scheduleCard}><header><div><h2>Horario actual</h2><p>Las actividades aparecerán cuando se registren datos reales.</p></div><span>Sin registros</span></header><div className={`table-wrap ${styles.scheduleTableWrap}`}><table><thead><tr><th>Hora</th><th>Aula</th><th>Asignatura / actividad</th><th>Docente</th><th>Grupo</th><th>Estado</th></tr></thead><tbody>{currentSchedule.length ? currentSchedule.map((item) => <tr key={`${item.room}-${item.subject}`}><td data-label="Hora"><code>08:00–10:00</code></td><td data-label="Aula"><Link href={`/aulas?aula=${item.room}`}>{item.room}</Link></td><td data-label="Asignatura / actividad"><strong>{item.subject}</strong></td><td data-label="Docente">{item.teacher}</td><td data-label="Grupo"><span>{item.group}</span></td><td data-label="Estado"><StatusBadge status={item.status} /></td></tr>) : <tr><td colSpan={6}>No hay actividades registradas.</td></tr>}</tbody></table></div><footer><span>{currentSchedule.length} actividades en el bloque</span><Link href="/horarios">Ver horario completo →</Link></footer></section>
        <section className={styles.roomSummary}><header><div><h2>Estado consolidado de aulas</h2><p>Resultado calculado; no se persiste como tabla independiente.</p></div><Link href="/disponibilidad">Abrir disponibilidad</Link></header><div>{(["disponible", "ocupada", "reservada", "mantenimiento", "bloqueada"] as const).map((state) => <article key={state}><i className={styles[`state_${state}`]} /><strong>{availability.filter((item) => item.calculatedState === state).length}</strong><span>{state[0].toLocaleUpperCase("es") + state.slice(1)}</span></article>)}</div></section>
      </div>
      <aside className={styles.operationalPanel}><header><div><p>{alerts.length} alertas calculadas</p></div></header><div className={styles.alertStats}><span><strong>0</strong>Críticas</span><span><strong>0</strong>Advertencias</span><span><strong>0</strong>Informativas</span></div><div className={styles.alertList}>{alerts.length ? alerts.map((alert) => <article key={alert.id} className={styles[`alert_${alert.severity}`]}><header><span>{alert.severity}</span><b>{alert.type}</b></header><p>{alert.message}</p>{alert.room && <small>Aula {alert.room}</small>}<Link href={alert.href}>{alert.action} →</Link></article>) : <p>No hay alertas registradas.</p>}</div><footer><span>Sin datos para calcular</span></footer></aside>
    </div>
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><strong>{value}</strong><span>{detail}</span><b>{label}</b></article>;
}
function StatusBadge({ status }: { status: ScheduleStatus }) {
  return <span className={`${styles.status} ${styles[`status_${status.toLocaleLowerCase()}`]}`}><i />{statusLabels[status]}</span>;
}
