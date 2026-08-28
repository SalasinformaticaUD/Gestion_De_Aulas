"use client";
import { applications, type ApplicationKey } from "@/features/auth/config/applications";
import { cambiarAplicacionActiva, eventoSesion, obtenerSesion, tieneAccesoAplicacion, type SesionAplicacion } from "@/features/auth/lib/sesion";
import { useEffect, useState } from "react";
export function ModuleSwitcher({ current, onNavigate }: { current: ApplicationKey; onNavigate?: () => void }) {
  const target = current === "aulas" ? applications.monitores : applications.aulas;
  const [sesion, setSesion] = useState<SesionAplicacion | null | undefined>(undefined);
  useEffect(() => {
    const actualizar = () => setSesion(obtenerSesion());
    actualizar();
    window.addEventListener(eventoSesion, actualizar);
    window.addEventListener("storage", actualizar);
    return () => { window.removeEventListener(eventoSesion, actualizar); window.removeEventListener("storage", actualizar); };
  }, []);
  // Hasta cargar la sesión no se presenta un destino por defecto.
  if (sesion === undefined || !tieneAccesoAplicacion(target.key, sesion)) return null;
  const cambiar = () => { if (!cambiarAplicacionActiva(target.key)) return; onNavigate?.(); window.location.assign(target.destination); };
  return <button type="button" className="nav-link nav-module-switcher" onClick={cambiar}><span className="nav-icon" aria-hidden="true">⇄</span>Cambiar a {target.name}</button>;
}
