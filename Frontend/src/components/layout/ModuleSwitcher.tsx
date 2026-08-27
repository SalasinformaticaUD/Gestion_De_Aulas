"use client";
import { applications, type ApplicationKey } from "@/features/auth/config/applications";
import { guardarSesion, obtenerSesion } from "@/features/auth/lib/sesion";
export function ModuleSwitcher({ current, onNavigate }: { current: ApplicationKey; onNavigate?: () => void }) {
  const target = current === "aulas" ? applications.monitores : applications.aulas;
  const cambiar = () => { const sesion = obtenerSesion(); if (sesion) guardarSesion({ ...sesion, aplicacion: target.key }); onNavigate?.(); window.location.assign(target.destination); };
  return <button type="button" className="nav-link nav-module-switcher" onClick={cambiar}><span className="nav-icon" aria-hidden="true">⇄</span>Cambiar a {target.name}</button>;
}
