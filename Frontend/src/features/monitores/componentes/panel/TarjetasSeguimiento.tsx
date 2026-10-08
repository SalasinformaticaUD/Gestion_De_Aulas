"use client";

import Link from "next/link";
import { useState } from "react";
import type { DashboardApi } from "@/features/monitores/api/contratosMonitores";
import estilos from "../SistemaVisualMonitores.module.css";

export function TarjetasSeguimiento({ tablero, modoConsulta = false }: { tablero: DashboardApi; modoConsulta?: boolean }) {
  const [extrasExpandidas, setExtrasExpandidas] = useState(false);
  const [anotacionesExpandidas, setAnotacionesExpandidas] = useState(false);
  const extras = !modoConsulta || extrasExpandidas ? tablero.pending_overtime : tablero.pending_overtime.slice(0, 4);
  const anotaciones = !modoConsulta || anotacionesExpandidas ? tablero.recent_annotations : tablero.recent_annotations.slice(0, 4);
  return <section className={estilos.rejillaSeguimiento} aria-label="Seguimiento de novedades">
    <Tarjeta titulo="Horas extra por aprobar" enlace={modoConsulta ? undefined : { href: "/gestion-monitores/horas-extra", texto: "Revisar" }} accion={modoConsulta && tablero.pending_overtime.length > 4 ? { texto: extrasExpandidas ? "Ver menos" : "Ver todas", ejecutar: () => setExtrasExpandidas((valor) => !valor) } : undefined}>
      {extras.map((item) => <article key={item.session_id}><strong>{item.monitor_name}</strong><span>{item.work_day} · {(item.overtime_minutes / 60).toFixed(1)} h por aprobar</span></article>)}
      {!tablero.pending_overtime.length && <EstadoVacio mensaje="No hay horas extra por aprobar." />}
    </Tarjeta>
    <Tarjeta titulo="Anotaciones recientes" enlace={modoConsulta ? undefined : { href: "/gestion-monitores/anotaciones", texto: "Ver todas" }} accion={modoConsulta && tablero.recent_annotations.length > 4 ? { texto: anotacionesExpandidas ? "Ver menos" : "Ver todas", ejecutar: () => setAnotacionesExpandidas((valor) => !valor) } : undefined}>
      {anotaciones.map((item) => <article key={item.id}><strong>{item.monitor_name} <em>{item.action === "deduct" ? "−" : item.action === "add" ? "+" : ""}{Math.abs(item.delta_minutes / 60).toFixed(1)} h</em></strong><span>{item.description || `Novedad · ${item.occurred_on}`}</span></article>)}
      {!tablero.recent_annotations.length && <EstadoVacio mensaje="Sin anotaciones recientes." />}
    </Tarjeta>
  </section>;
}

function Tarjeta({ titulo, enlace, accion, children }: { titulo: string; enlace?: { href: string; texto: string }; accion?: { texto: string; ejecutar: () => void }; children: React.ReactNode }) {
  return <article className={`${estilos.tarjeta} ${estilos.tarjetaSeguimiento}`}><header><h2>{titulo}</h2>{enlace && <Link className={estilos.enlaceTarjeta} href={enlace.href}>{enlace.texto}</Link>}{accion && <button type="button" className={estilos.enlaceTarjeta} onClick={accion.ejecutar}>{accion.texto}</button>}</header><div className={estilos.contenidoSeguimiento}>{children}</div></article>;
}

function EstadoVacio({ mensaje }: { mensaje: string }) { return <p className={estilos.estadoVacioTarjeta}>{mensaje}</p>; }
