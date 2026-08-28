import Link from "next/link";
import type { DashboardApi } from "@/features/monitores/api/contratosMonitores";
import estilos from "../SistemaVisualMonitores.module.css";

export function TarjetasSeguimiento({ tablero }: { tablero: DashboardApi }) {
  return <section className={estilos.rejillaSeguimiento} aria-label="Seguimiento de novedades">
    <Tarjeta titulo="Horas extra por aprobar" enlace={{ href: "/gestion-monitores/horas-extra", texto: "Revisar" }}>
      {tablero.pending_overtime.map((item) => <article key={item.session_id}><strong>{item.monitor_name}</strong><span>{item.work_day} · {(item.overtime_minutes / 60).toFixed(1)} h por aprobar</span></article>)}
      {!tablero.pending_overtime.length && <EstadoVacio mensaje="No hay horas extra por aprobar." />}
    </Tarjeta>
    <Tarjeta titulo="Notificaciones">
      {tablero.notifications.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.body}</span></article>)}
      {!tablero.notifications.length && <EstadoVacio mensaje="No hay notificaciones recientes." />}
    </Tarjeta>
    <Tarjeta titulo="Anotaciones recientes" enlace={{ href: "/gestion-monitores/anotaciones", texto: "Ver todas" }}>
      {tablero.recent_annotations.map((item) => <article key={item.id}><strong>{item.monitor_name} <em>{item.action === "deduct" ? "−" : item.action === "add" ? "+" : ""}{Math.abs(item.delta_minutes / 60).toFixed(1)} h</em></strong><span>{item.description || `Novedad · ${item.occurred_on}`}</span></article>)}
      {!tablero.recent_annotations.length && <EstadoVacio mensaje="Sin anotaciones recientes." />}
    </Tarjeta>
  </section>;
}

function Tarjeta({ titulo, enlace, children }: { titulo: string; enlace?: { href: string; texto: string }; children: React.ReactNode }) {
  return <article className={`${estilos.tarjeta} ${estilos.tarjetaSeguimiento}`}><header><h2>{titulo}</h2>{enlace && <Link className={estilos.enlaceTarjeta} href={enlace.href}>{enlace.texto}</Link>}</header><div className={estilos.contenidoSeguimiento}>{children}</div></article>;
}

function EstadoVacio({ mensaje }: { mensaje: string }) { return <p className={estilos.estadoVacioTarjeta}>{mensaje}</p>; }
