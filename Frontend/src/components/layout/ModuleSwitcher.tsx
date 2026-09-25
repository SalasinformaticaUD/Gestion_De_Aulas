"use client";
import { applications, type ApplicationKey } from "@/features/auth/config/applications";
import { cambiarAplicacionActiva, eventoSesion, guardarSesion, obtenerSesion, tieneAccesoAplicacion, type SesionAplicacion } from "@/features/auth/lib/sesion";
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
  // Solo el administrador de Monitores y el líder de Aulas de Software pueden abrir Gestión de Aulas desde Monitores.
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  // La plataforma puede identificar estos perfiles mediante el rol o el cargo; se contemplan ambas fuentes.
  const perfiles = [...(sesion?.usuario.roles ?? []), sesion?.usuario.cargo ?? ""].map(normalizar);
  const esAdministradorMonitores = perfiles.some((perfil) => perfil === "ADMIN" || perfil === "ADMINISTRADOR" || (perfil.includes("ADMIN") && perfil.includes("MONITOR")));
  const esLider = perfiles.some((perfil) => perfil.includes("LIDER") || perfil.includes("LEADER"));
  const esLiderAulasSoftware = esLider
    && [sesion?.usuario.dependencia?.id, sesion?.usuario.dependencia?.nombre, ...perfiles].some((dependencia) => {
      const valor = normalizar(dependencia ?? "");
      return valor === "INFORMATICS_LABS" || valor.includes("INFORMATICS") || valor.includes("AULAS DE SOFTWARE");
    });
  const puedeCambiarAAulas = current !== "monitores" || esAdministradorMonitores || esLiderAulasSoftware;
  const tieneTokenCentral = sesion?.origen !== "monitores-local" && Boolean(sesion?.tokenAcceso);
  const tieneAccesoDestino = tieneAccesoAplicacion(target.key, sesion) || (current === "monitores" && puedeCambiarAAulas && tieneTokenCentral);
  // Hasta cargar la sesión no se presenta un destino por defecto.
  if (sesion === undefined || sesion === null || !tieneAccesoDestino || !puedeCambiarAAulas) return null;
  const sesionActual = sesion;
  const cambiar = () => {
    if (!tieneAccesoAplicacion(target.key, sesionActual)) {
      guardarSesion({ ...sesionActual, aplicacion: target.key, aplicacionesAutorizadas: [...new Set([...sesionActual.aplicacionesAutorizadas, target.key])] });
    } else if (!cambiarAplicacionActiva(target.key)) return;
    onNavigate?.(); window.location.assign(target.destination);
  };
  return <button type="button" className="nav-link nav-module-switcher" onClick={cambiar}><span className="nav-icon" aria-hidden="true">⇄</span>Cambiar a {target.name}</button>;
}
