"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { registrarAsistencia } from "@/features/horarios/api/horariosApi";
import { actualizarUsuarioSesion, eventoSesion, obtenerSesion, tienePermiso } from "@/features/auth/lib/sesion";
import { solicitarAulas, type UsuarioCentral } from "@/features/monitores/api/clienteMonitores";
import { consultarResumenPanel, descartarNotificacionPanel, type ResumenPanelOperativo } from "../api/panelOperativoApi";
import styles from "./DashboardView.module.css";

const alertTypeLabels: Record<string, string> = {
  "nueva-observacion": "Nueva observación", "devolucion-audiovisual": "Devolución próxima",
  "fin-practica-libre": "Práctica por finalizar", "ausencia-docente": "Ausencia docente", "asistencia-pendiente": "Asistencia pendiente",
  mantenimiento: "Mantenimiento", bloqueada: "Aula bloqueada", "prestamo-programado": "Préstamo de aula", "credencial-actualizada": "Credencial actualizada",
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
  const [descartandoAlerta, setDescartandoAlerta] = useState<string | null>(null);
  const [puedeVerHorarioMonitores, setPuedeVerHorarioMonitores] = useState(false);
  const [version, setVersion] = useState(0);
  const [filtroNotificaciones, setFiltroNotificaciones] = useState<"critica" | "advertencia" | "info" | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const guardado = JSON.parse(window.sessionStorage.getItem("dashboard-aulas:estado-retorno") ?? "null") as { filtroNotificaciones?: "critica" | "advertencia" | "info" | null } | null;
      return guardado?.filtroNotificaciones ?? null;
    } catch { return null; }
  });
  useEffect(() => {
    try {
      const guardado = JSON.parse(window.sessionStorage.getItem("dashboard-aulas:estado-retorno") ?? "null") as { scrollY?: number } | null;
      if (!guardado) return;
      window.sessionStorage.removeItem("dashboard-aulas:estado-retorno");
      window.requestAnimationFrame(() => window.scrollTo({ top: guardado.scrollY ?? 0, behavior: "instant" }));
    } catch { window.sessionStorage.removeItem("dashboard-aulas:estado-retorno"); }
  }, []);
  const guardarEstadoAntesDeVerMonitores = () => {
    window.sessionStorage.setItem("dashboard-aulas:estado-retorno", JSON.stringify({ filtroNotificaciones, scrollY: window.scrollY }));
  };
  useEffect(() => {
    const actualizarAcceso = () => {
      const sesion = obtenerSesion();
      setPuedeVerHorarioMonitores(tienePermiso("DASHBOARD_VER_HORARIO_MONITORES", sesion));
    };
    actualizarAcceso();
    const sesion = obtenerSesion();
    if (sesion?.tokenAcceso && sesion.origen !== "monitores-local") {
      void solicitarAulas<UsuarioCentral>("/auth/me", sesion.tokenAcceso, { notificarAutorizacion: false })
        .then((usuario) => actualizarUsuarioSesion(usuario))
        .catch(() => undefined);
    }
    window.addEventListener(eventoSesion, actualizarAcceso);
    return () => window.removeEventListener(eventoSesion, actualizarAcceso);
  }, []);
  useEffect(() => {
    let controller: AbortController | null = null;
    let cargandoPeticion = false;
    let forzarSiguiente = version > 0;
    const cargar = async () => {
      if (document.hidden || cargandoPeticion) return;
      cargandoPeticion = true;
      controller = new AbortController();
      const forzarActualizacion = forzarSiguiente;
      forzarSiguiente = false;
      try { setResumen(await consultarResumenPanel(fechaBogota(), controller.signal, forzarActualizacion)); setError(""); }
      catch (reason) {
        if ((reason as { name?: string }).name === "AbortError") {
          if (forzarActualizacion) forzarSiguiente = true;
        } else {
          setError(reason instanceof Error ? reason.message : "No fue posible consultar el panel.");
        }
      }
      finally { cargandoPeticion = false; setCargando(false); }
    };
    const alCambiarVisibilidad = () => {
      if (document.hidden) controller?.abort();
      else void cargar();
    };
    void cargar();
    const intervalo = window.setInterval(() => void cargar(), 60_000);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      controller?.abort();
    };
  }, [version]);
  const alertasSinTareas = useMemo(
    () => resumen?.alertas.filter((alerta) => alerta.tipo !== "tarea-operativa") ?? [],
    [resumen],
  );
  const conteoAlertas = useMemo(() => ({
    critica: alertasSinTareas.filter((a) => a.severidad === "critica").length,
    advertencia: alertasSinTareas.filter((a) => a.severidad === "advertencia").length,
    info: alertasSinTareas.filter((a) => a.severidad === "info").length,
  }), [alertasSinTareas]);
  const bloque = resumen ? `${resumen.bloqueReferencia.horaInicio}–${resumen.bloqueReferencia.horaFin}` : "—";
  const horario = useMemo(() => [...(resumen?.horarioActual ?? [])].sort((a, b) => a.aulaCodigo.localeCompare(b.aulaCodigo, "es", { numeric: true })), [resumen]);
  const alertas = useMemo(() => [...alertasSinTareas]
    .sort((a, b) => ordenSeveridad[a.severidad] - ordenSeveridad[b.severidad])
    .filter((alerta) => !filtroNotificaciones || alerta.severidad === filtroNotificaciones), [alertasSinTareas, filtroNotificaciones]);
  const guardarAsistencia = async (claseId: string, estado: "ASISTIO" | "AUSENTE") => {
    setGuardandoAsistencia(claseId); setError("");
    try {
      await registrarAsistencia(claseId, resumen?.fecha ?? fechaBogota(), estado);
      setResumen((actual) => actual ? {
        ...actual,
        horarioActual: actual.horarioActual.map((item) => item.id === claseId
          ? { ...item, estado: estado === "ASISTIO" ? "EN_CLASE" : "AUSENTE" }
          : item),
      } : actual);
      setVersion((actual) => actual + 1);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible registrar la asistencia."); }
    finally { setGuardandoAsistencia(null); }
  };
  const quitarNotificacion = async (alertaId: string) => {
    if (!resumen) return;
    setDescartandoAlerta(alertaId); setError("");
    try {
      await descartarNotificacionPanel(alertaId, resumen.fecha, resumen.bloqueReferencia.horaInicio);
      setResumen((actual) => actual ? {
        ...actual,
        alertas: actual.alertas.filter((alerta) => alerta.id !== alertaId),
        metricas: { ...actual.metricas, alertas: Math.max(0, actual.metricas.alertas - 1) },
      } : actual);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible quitar la notificación."); }
    finally { setDescartandoAlerta(null); }
  };
  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Panel de Control Operativo</h1><p>Resumen en tiempo real del bloque en curso o del siguiente, desde 15 minutos antes de iniciar.</p></div><div className={styles.headingActions}>{puedeVerHorarioMonitores && <Link className={styles.monitorScheduleButton} href="/horario-monitores" onClick={guardarEstadoAntesDeVerMonitores}>Ver horario monitores</Link>}<span className={styles.live}><i />{cargando ? "Actualizando…" : `Bloque ${bloque}`}</span></div></section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.dashboardLayout}>
      <div className={styles.mainColumn}>
        <section className={styles.metrics} aria-label="Indicadores del bloque actual">
          <Metric label="Aulas disponibles" value={resumen?.metricas.disponibles ?? 0} detail={`de ${resumen?.metricas.totalAulas ?? 0} aulas`} tone="green" />
          <Metric label="Clases en curso" value={resumen?.metricas.ocupadas ?? 0} detail={`bloque ${bloque}`} tone="blue" />
          <Metric label="Prácticas libres" value={resumen?.metricas.practicasActivas ?? 0} detail="activas en el bloque" tone="violet" />
          <Metric label="Audiovisuales prestados" value={resumen?.metricas.audiovisualesPrestados ?? 0} detail="pendientes de devolución" tone="amber" />
        </section>
        <section className={styles.scheduleCard}><header><div><h2>Horario del bloque</h2><p>Las aulas se ordenan de forma ascendente. El siguiente bloque se habilita 15 minutos antes.</p></div><span>{bloque}</span></header><div className={`table-wrap ${styles.scheduleTableWrap}`}><table className="schedule schedule-list"><thead><tr><th>Hora</th><th>Aula</th><th>Asignatura</th><th>Docente</th><th>Grupo</th><th>Asistencia</th></tr></thead><tbody>{horario.length ? horario.map((item) => { const estadoAsistencia = item.estado === "EN_CLASE" ? "ASISTIO" : item.estado; return <tr key={item.id}><td data-label="Hora"><code>{item.horaInicio}–{item.horaFin}</code></td><td data-label="Aula"><Link href={`/aulas?aula=${encodeURIComponent(item.aulaCodigo)}`}>{item.aulaCodigo}</Link></td><td data-label="Asignatura"><strong>{item.asignatura}</strong>{item.proyecto && <small className={styles.project}>{item.proyecto}</small>}</td><td data-label="Docente">{item.docente}</td><td data-label="Grupo"><span>{item.grupo}</span></td><td data-label="Asistencia"><span className={`attendance-state attendance-${estadoAsistencia.toLowerCase()}`}>{estadoAsistencia === "ASISTIO" ? "Asistió" : estadoAsistencia === "AUSENTE" ? "No asistió" : "Pendiente"}</span><small className="attendance-help">Fecha: {resumen?.fecha ?? fechaBogota()}</small><div className="attendance-actions"><button type="button" className="attendance-check" aria-label="Asistió" disabled={guardandoAsistencia === item.id} onClick={() => void guardarAsistencia(item.id, "ASISTIO")}>✓</button><button type="button" className="attendance-cross" aria-label="No asistió" disabled={guardandoAsistencia === item.id} onClick={() => void guardarAsistencia(item.id, "AUSENTE")}>✕</button></div></td></tr>; }) : <tr><td colSpan={6}>No hay clases programadas en este bloque.</td></tr>}</tbody></table></div><footer><span>{horario.length} clases en el bloque</span><Link href="/horarios">Ver otros horarios →</Link></footer></section>
      </div>
      <aside className={styles.operationalPanel}><header><div><h2>Notificaciones</h2><p>{alertas.length} novedades calculadas</p></div></header><div className={styles.alertStats}><span><strong>{conteoAlertas.critica}</strong>Críticas</span><span><strong>{conteoAlertas.advertencia}</strong>Advertencias</span><span><strong>{conteoAlertas.info}</strong>Informativas</span></div><div className={styles.alertFilters} aria-label="Filtrar notificaciones"><button type="button" aria-pressed={!filtroNotificaciones} className={!filtroNotificaciones ? styles.activeAlertFilter : ""} onClick={() => setFiltroNotificaciones(null)}>Todas</button>{([["critica", "Críticas"], ["advertencia", "Advertencias"], ["info", "Informativas"]] as const).map(([valor, etiqueta]) => <button type="button" key={valor} aria-pressed={filtroNotificaciones === valor} className={filtroNotificaciones === valor ? styles.activeAlertFilter : ""} onClick={() => setFiltroNotificaciones((actual) => actual === valor ? null : valor)}>{etiqueta}</button>)}</div><div className={styles.alertList}>{alertas.length ? alertas.map((alerta) => <article key={alerta.id} className={styles[`alert_${alerta.severidad}`]}><header><span>{alerta.severidad}</span><b>{alertTypeLabels[alerta.tipo] ?? alerta.tipo.replaceAll("-", " ")}</b><button type="button" className={styles.dismissAlert} aria-label={`Quitar notificación: ${alertTypeLabels[alerta.tipo] ?? alerta.tipo}`} title="Quitar para mi usuario" disabled={descartandoAlerta === alerta.id} onClick={() => void quitarNotificacion(alerta.id)}>×</button></header><p>{alerta.mensaje}</p>{alerta.aulaCodigo && <small>Aula {alerta.aulaCodigo}</small>}{alerta.enlace && <Link href={alerta.enlace}>{alerta.accion ?? "Ver detalle"} →</Link>}</article>) : <p className={styles.emptyAlerts}>No hay notificaciones para el bloque actual.</p>}</div><footer><span>Actualización automática cada minuto</span><b>En línea</b></footer></aside>
    </div>
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) { return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><strong>{value}</strong><span>{detail}</span><b>{label}</b></article>; }
