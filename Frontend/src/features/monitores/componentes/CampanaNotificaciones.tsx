"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import estilos from "./SistemaVisualMonitores.module.css";

type Notificacion = DashboardApi["notifications"][number];

/** Cada evento abre el módulo donde se puede consultar o continuar la acción. */
const destinosNotificacion: Record<string, string> = {
  session_processed: "/gestion-monitores/registros",
  overtime_reviewed: "/gestion-monitores/horas-extra",
  annotation_created: "/gestion-monitores/anotaciones",
  commitment_act_reviewed: "/gestion-monitores/actas",
  commitment_act_uploaded: "/gestion-monitores/actas",
  overtime_submitted: "/gestion-monitores/horas-extra",
  monitor_created: "/gestion-monitores/monitores",
  monitor_updated: "/gestion-monitores/monitores",
  schedule_created: "/gestion-monitores/horarios",
  schedule_updated: "/gestion-monitores/horarios",
  attendance_imported: "/gestion-monitores/registros",
  attendance_reconciled: "/gestion-monitores/asistencia/conciliacion",
};

function destino(notificacion: Notificacion) {
  const enlace = notificacion.payload?.url ?? notificacion.payload?.href ?? notificacion.payload?.link;
  return typeof enlace === "string" && enlace.startsWith("/")
    ? enlace
    : destinosNotificacion[notificacion.event_type ?? ""] ?? "/gestion-monitores";
}

export function CampanaNotificaciones() {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [error, setError] = useState("");

  const [actualizando, setActualizando] = useState(false);
  const cargar = useCallback(async () => {
    setActualizando(true);
    try { setNotificaciones(await servicioMonitores.listarNotificaciones()); setError(""); }
    catch { setError("No fue posible cargar las notificaciones."); }
    finally { setActualizando(false); }
  }, []);

  useEffect(() => {
    void cargar();
    const intervalo = window.setInterval(() => void cargar(), 30_000);
    const alRecuperarFoco = () => { if (!document.hidden) void cargar(); };
    document.addEventListener("visibilitychange", alRecuperarFoco);
    return () => { window.clearInterval(intervalo); document.removeEventListener("visibilitychange", alRecuperarFoco); };
  }, [cargar]);

  const ordenadas = useMemo(() => [...notificaciones].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  }), [notificaciones]);
  const nuevas = useMemo(() => ordenadas.filter((item) => !item.is_read).length, [ordenadas]);
  const abrirNotificacion = async (notificacion: Notificacion) => {
    if (!notificacion.is_read) {
      try {
        await servicioMonitores.marcarNotificacionLeida(notificacion.id);
        setNotificaciones((actual) => {
          const leida = actual.find((item) => item.id === notificacion.id);
          return leida ? [...actual.filter((item) => item.id !== notificacion.id), { ...leida, is_read: true }] : actual;
        });
      } catch { /* La navegación sigue disponible aunque falle el marcado. */ }
    }
    setAbierta(false);
    router.push(destino(notificacion));
  };

  return <div className={estilos.campanaNotificaciones}>
    <button type="button" className={estilos.botonCampana} aria-label={`Notificaciones${nuevas ? `, ${nuevas} nuevas` : ""}`} aria-expanded={abierta} onClick={() => setAbierta((actual) => { const siguiente = !actual; if (siguiente) void cargar(); return siguiente; })}>
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{nuevas > 0 && <b>{nuevas > 99 ? "99+" : nuevas}</b>}
    </button>
    {abierta && <section className={estilos.menuNotificaciones} aria-label="Lista de notificaciones">
      <header><div><h2>Notificaciones</h2><p>{nuevas ? `${nuevas} nueva${nuevas === 1 ? "" : "s"}` : "Todo al día"}</p></div><button type="button" aria-label="Cerrar notificaciones" onClick={() => setAbierta(false)}>×</button></header>
      <div className={estilos.listaMenuNotificaciones}>{ordenadas.map((notificacion) => <button key={notificacion.id} type="button" className={!notificacion.is_read ? estilos.itemNotificacionNueva : undefined} onClick={() => void abrirNotificacion(notificacion)}><span>{notificacion.is_read ? "Leída" : "Nueva"}</span><strong>{notificacion.title}</strong><p>{notificacion.body}</p></button>)}{!ordenadas.length && <p className={estilos.notificacionesVaciasDashboard}>{error || "No tiene notificaciones recientes."}</p>}</div>
    </section>}
  </div>;
}
