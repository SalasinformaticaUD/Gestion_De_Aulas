"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { registrarAsistencia } from "@/features/horarios/api/horariosApi";
import { consultarResumenPanel, type ResumenPanelOperativo } from "../api/panelOperativoApi";
import styles from "./DashboardView.module.css";

const alertTypeLabels: Record<string, string> = {
  "tarea-operativa": "Tarea operativa", "nueva-observacion": "Nueva observación", "devolucion-audiovisual": "Devolución próxima",
  "fin-practica-libre": "Práctica por finalizar", "ausencia-docente": "Ausencia docente", "asistencia-pendiente": "Asistencia pendiente",
  mantenimiento: "Mantenimiento", bloqueada: "Aula bloqueada", "prestamo-programado": "Préstamo de aula",
};
const ordenSeveridad = { critica: 0, advertencia: 1, info: 2 } as const;

function fechaBogota() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function DashboardView() {
  const [resumen, setResumen] = useState<ResumenPanelOperativo | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardandoAsistencia, setGuardandoAsistencia] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [filtroNotificaciones, setFiltroNotificaciones] = useState<"critica" | "advertencia" | "info" | null>(null);
  useEffect(() => {
    let controller: AbortController | null = null;
    const cargar = async () => {
      controller?.abort(); controller = new AbortController();
      try { setResumen(await consultarResumenPanel(fechaBogota(), controller.signal)); setError(""); }
      catch (reason) { if ((reason as { name?: string }).name !== "AbortError") setError(reason instanceof Error ? reason.message : "No fue posible consultar el panel."); }
      finally { setCargando(false); }
    };
    void cargar(); const intervalo = window.setInterval(() => void cargar(), 60_000);
    return () => { window.clearInterval(intervalo); controller?.abort(); };
  }, [version]);
  const conteoAlertas = useMemo(() => ({
    critica: resumen?.alertas.filter((a) => a.severidad === "critica").length ?? 0,
    advertencia: resumen?.alertas.filter((a) => a.severidad === "advertencia").length ?? 0,
    info: resumen?.alertas.filter((a) => a.severidad === "info").length ?? 0,
  }), [resumen]);
  const bloque = resumen ? `${resumen.bloqueReferencia.horaInicio}–${resumen.bloqueReferencia.horaFin}` : "—";
  const aulas = resumen?.aulas ?? [], horario = resumen?.horarioActual ?? [];
  const alertas = useMemo(() => [...(resumen?.alertas ?? [])]
    .sort((a, b) => ordenSeveridad[a.severidad] - ordenSeveridad[b.severidad])
    .filter((alerta) => !filtroNotificaciones || alerta.severidad === filtroNotificaciones), [filtroNotificaciones, resumen]);
  const guardarAsistencia = async (claseId: string, estado: "ASISTIO" | "AUSENTE") => {
    setGuardandoAsistencia(claseId); setError("");
    try { await registrarAsistencia(claseId, resumen?.fecha ?? fechaBogota(), estado); setVersion((actual) => actual + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible registrar la asistencia."); }
    finally { setGuardandoAsistencia(null); }
  };
  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Panel de Control Operativo</h1><p>Resumen en tiempo real del bloque vigente. Para consultar otros bloques, abra el módulo de horarios.</p></div><span className={styles.live}><i />{cargando ? "Actualizando…" : `Bloque ${bloque}`}</span></section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.dashboardLayout}>
      <div className={styles.mainColumn}>
        <section className={styles.metrics} aria-label="Indicadores del bloque actual">
          <Metric label="Aulas disponibles" value={resumen?.metricas.disponibles ?? 0} detail={`de ${resumen?.metricas.totalAulas ?? 0} aulas`} tone="green" />
          <Metric label="Clases en curso" value={resumen?.metricas.ocupadas ?? 0} detail={`bloque ${bloque}`} tone="blue" />
          <Metric label="Prácticas libres" value={resumen?.metricas.practicasActivas ?? 0} detail="activas en el bloque" tone="violet" />
          <Metric label="Audiovisuales prestados" value={resumen?.metricas.audiovisualesPrestados ?? 0} detail="pendientes de devolución" tone="amber" />
        </section>
        <section className={styles.scheduleCard}><header><div><h2>Horario actual</h2><p>Solo se muestran las clases del bloque que está transcurriendo.</p></div><span>{bloque}</span></header><div className={`table-wrap ${styles.scheduleTableWrap}`}><table className="schedule schedule-list"><thead><tr><th>Hora</th><th>Aula</th><th>Asignatura</th><th>Docente</th><th>Grupo</th><th>Asistencia</th></tr></thead><tbody>{horario.length ? horario.map((item) => { const estadoAsistencia = item.estado === "EN_CLASE" ? "ASISTIO" : item.estado; return <tr key={item.id}><td data-label="Hora"><code>{item.horaInicio}–{item.horaFin}</code></td><td data-label="Aula"><Link href={`/aulas?aula=${encodeURIComponent(item.aulaCodigo)}`}>{item.aulaCodigo}</Link></td><td data-label="Asignatura"><strong>{item.asignatura}</strong>{item.proyecto && <small className={styles.project}>{item.proyecto}</small>}</td><td data-label="Docente">{item.docente}</td><td data-label="Grupo"><span>{item.grupo}</span></td><td data-label="Asistencia"><span className={`attendance-state attendance-${estadoAsistencia.toLowerCase()}`}>{estadoAsistencia === "ASISTIO" ? "Asistió" : estadoAsistencia === "AUSENTE" ? "No asistió" : "Pendiente"}</span><small className="attendance-help">Fecha: {resumen?.fecha ?? fechaBogota()}</small><div className="attendance-actions"><button type="button" className="attendance-check" aria-label="Asistió" disabled={guardandoAsistencia === item.id} onClick={() => void guardarAsistencia(item.id, "ASISTIO")}>✓</button><button type="button" className="attendance-cross" aria-label="No asistió" disabled={guardandoAsistencia === item.id} onClick={() => void guardarAsistencia(item.id, "AUSENTE")}>✕</button></div></td></tr>; }) : <tr><td colSpan={6}>No hay clases programadas en el bloque actual.</td></tr>}</tbody></table></div><footer><span>{horario.length} clases en el bloque</span><Link href="/horarios">Ver otros horarios →</Link></footer></section>
        <section className={styles.roomSummary}><header><div><h2>Estado de aulas en este bloque</h2><p>Incluye cambios por asistencia, préstamos, prácticas y restricciones.</p></div><Link href="/disponibilidad">Abrir disponibilidad</Link></header><div>{(["disponible", "ocupada", "reservada", "mantenimiento", "bloqueada"] as const).map((estado) => <article key={estado}><i className={styles[`state_${estado}`]} /><strong>{aulas.filter((aula) => aula.estadoCalculado === estado).length}</strong><span>{estado[0].toLocaleUpperCase("es") + estado.slice(1)}</span></article>)}</div></section>
      </div>
      <aside className={styles.operationalPanel}><header><div><h2>Notificaciones</h2><p>{alertas.length} novedades calculadas</p></div></header><div className={styles.alertStats}><span><strong>{conteoAlertas.critica}</strong>Críticas</span><span><strong>{conteoAlertas.advertencia}</strong>Advertencias</span><span><strong>{conteoAlertas.info}</strong>Informativas</span></div><div className={styles.alertFilters} aria-label="Filtrar notificaciones"><button type="button" aria-pressed={!filtroNotificaciones} className={!filtroNotificaciones ? styles.activeAlertFilter : ""} onClick={() => setFiltroNotificaciones(null)}>Todas</button>{([["critica", "Críticas"], ["advertencia", "Advertencias"], ["info", "Informativas"]] as const).map(([valor, etiqueta]) => <button type="button" key={valor} aria-pressed={filtroNotificaciones === valor} className={filtroNotificaciones === valor ? styles.activeAlertFilter : ""} onClick={() => setFiltroNotificaciones((actual) => actual === valor ? null : valor)}>{etiqueta}</button>)}</div><div className={styles.alertList}>{alertas.length ? alertas.map((alerta) => <article key={alerta.id} className={styles[`alert_${alerta.severidad}`]}><header><span>{alerta.severidad}</span><b>{alertTypeLabels[alerta.tipo] ?? alerta.tipo.replaceAll("-", " ")}</b></header><p>{alerta.mensaje}</p>{alerta.aulaCodigo && <small>Aula {alerta.aulaCodigo}</small>}{alerta.enlace && <Link href={alerta.enlace}>{alerta.accion ?? "Ver detalle"} →</Link>}</article>) : <p className={styles.emptyAlerts}>No hay notificaciones para el bloque actual.</p>}</div><footer><span>Actualización automática cada minuto</span><b>En línea</b></footer></aside>
    </div>
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) { return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><strong>{value}</strong><span>{detail}</span><b>{label}</b></article>; }
