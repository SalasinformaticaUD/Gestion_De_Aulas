"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { applyTheme, defaultProfile, getInitials, loadTheme, profileFromSession, type UserProfile } from "@/features/perfil/lib/profile";
import { cerrarSesion, eventoSesion, obtenerSesion } from "@/features/auth/lib/sesion";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ModuleSwitcher } from "@/components/layout/ModuleSwitcher";
import { solicitarMonitores } from "@/features/monitores/api/clienteMonitores";
import { SelectoresNativosPersonalizados } from "./SelectoresNativosPersonalizados";
import { CampanaNotificaciones } from "./CampanaNotificaciones";

const navegacion = [
  { href:"/gestion-monitores", label:"Dashboard" },
  { href:"/gestion-monitores/monitores", label:"Monitores" },
  { href:"/gestion-monitores/horarios", label:"Horarios" },
  { href:"/gestion-monitores/horas-extra", label:"Horas extra" },
  { href:"/gestion-monitores/memorandos", label:"Memorandos" },
  { href:"/gestion-monitores/actas", label:"Actas" },
  { href:"/gestion-monitores/registros", label:"Registros" },
  { href:"/gestion-monitores/asistencia/conciliacion", label:"Conciliación" },
  { href:"/gestion-monitores/anotaciones", label:"Anotaciones" },
  { href:"/gestion-monitores/inconsistencias", label:"Inconsistencias" },
  { href:"/gestion-monitores/excepciones", label:"Excepciones" },
  { href:"/gestion-monitores/usuarios", label:"Usuarios" },
] as const;

export function MarcoMonitores({ children }: { children:React.ReactNode }) {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [panelContraido, setPanelContraido] = useState(false);
  const [perfil, setPerfil] = useState<UserProfile>(defaultProfile);
  const [ahora, setAhora] = useState<Date | null>(null);
  const [puedeGestionarUsuarios, setPuedeGestionarUsuarios] = useState(false);
  const [esMonitor, setEsMonitor] = useState(() =>
    (obtenerSesion()?.usuario.roles ?? []).some((rol) => rol.trim().toLowerCase() === "monitor"),
  );
  useEffect(() => {
    const refrescar = () => {
      const usuario = obtenerSesion()?.usuario;
      setPerfil(usuario ? profileFromSession(usuario) : defaultProfile);
    };
    refrescar(); applyTheme(loadTheme());
    window.addEventListener(eventoSesion, refrescar);
    return () => {
      window.removeEventListener(eventoSesion, refrescar);
    };
  }, []);
  useEffect(() => {
    let vigente = true;
    void solicitarMonitores<{ role: string }>("/api/v1/auth/me/")
      .then((usuario) => { if (vigente) { const rol = usuario.role.trim().toLowerCase(); setPuedeGestionarUsuarios(rol === "admin"); setEsMonitor(rol === "monitor"); } })
      .catch(() => {
        if (vigente) {
          const rolesSesion = obtenerSesion()?.usuario.roles ?? [];
          setPuedeGestionarUsuarios(false);
          setEsMonitor(rolesSesion.some((rol) => rol.trim().toLowerCase() === "monitor"));
        }
      });
    return () => { vigente = false; };
  }, []);
  const rutasMonitor = new Set([
    "/gestion-monitores",
    "/gestion-monitores/anotaciones",
    "/gestion-monitores/registros",
    "/gestion-monitores/actas",
  ]);
  const navegacionVisible = navegacion.filter((item) =>
    esMonitor ? rutasMonitor.has(item.href) : item.href !== "/gestion-monitores/usuarios" || puedeGestionarUsuarios,
  );
  useEffect(() => {
    const actualizar = () => setAhora(new Date());
    actualizar(); const reloj = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(reloj);
  }, []);
  const fecha = ahora?.toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) ?? "martes, 25 de agosto de 2026";
  const hora = ahora?.toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }) ?? "08:00:00";
  const salir = () => {
    cerrarSesion();
    setMenuAbierto(false);
    window.location.assign("/");
  };
  const alternarMenu = () => {
    if (window.matchMedia("(max-width: 820px)").matches) {
      setMenuAbierto((abierto) => !abierto);
      return;
    }
    setPanelContraido((contraido) => !contraido);
  };
  return <div className={`app-shell ${panelContraido ? "sidebar-collapsed" : ""}`}><SelectoresNativosPersonalizados />
    {menuAbierto && <button className="menu-overlay" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} />}
    <aside className={`sidebar ${menuAbierto ? "is-open" : ""}`} aria-label="Navegación de gestión de monitores">
      <Link href="/gestion-monitores" className="brand" aria-label="Ir al panel de monitores" onClick={() => setMenuAbierto(false)}><Image className="sidebar-monitores-logo" src="/brand/Logo_Cosmos_Monitores.png" alt="Monitores · Laboratorios de Ingeniería" width={608} height={322} priority /></Link>
      <nav className="nav"><p className="nav-label">Monitores</p>{navegacionVisible.map((item) => <Link key={item.href} href={item.href} className="nav-link" aria-current={ruta === item.href ? "page" : undefined} onClick={() => setMenuAbierto(false)}><span className="nav-icon" aria-hidden="true">•</span>{item.label}</Link>)}</nav>
      <footer className="sidebar-footer"><ModuleSwitcher current="monitores" onNavigate={() => setMenuAbierto(false)} /><button type="button" className="nav-link nav-logout" onClick={salir}><span className="nav-icon" aria-hidden="true">↪</span>Salir</button></footer>
    </aside>
    <section className="workspace"><header className="topbar"><button className="menu-button" type="button" aria-label={panelContraido ? "Mostrar menú" : "Ocultar menú"} aria-expanded={menuAbierto || !panelContraido} onClick={alternarMenu}>☰</button><span className="period">SEMESTRE 2026-3</span><div className="date-time"><span>{fecha}</span><time dateTime={ahora?.toISOString()}>{hora}</time></div><span className="topbar-spacer" /><CampanaNotificaciones /><ThemeToggle /><Link href="/gestion-monitores/perfil" className="profile"><span className={`avatar ${perfil.photo ? "avatar-has-photo" : ""}`}>{perfil.photo ? <img src={perfil.photo} alt="" /> : getInitials(perfil.fullName)}</span><span className="profile-copy"><strong>{perfil.fullName}</strong><small>{perfil.role}</small></span></Link></header><main>{children}</main></section>
  </div>;
}

