"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { applyTheme, defaultProfile, getInitials, loadProfile, loadTheme, profileEvent, type UserProfile } from "@/features/perfil/lib/profile";

const navegacion = [
  { href:"/gestion-monitores", label:"Panel de monitores" },
  { href:"/gestion-monitores/horarios", label:"Horarios" },
  { href:"/gestion-monitores/asistencia/importar", label:"Importar asistencia" },
  { href:"/gestion-monitores/asistencia/conciliacion", label:"Conciliación" },
  { href:"/gestion-monitores/anotaciones", label:"Anotaciones" },
  { href:"/gestion-monitores/excepciones", label:"Excepciones" },
  { href:"/gestion-monitores/horas-extra", label:"Horas extra" },
  { href:"/consulta-monitores", label:"Consulta pública" },
] as const;

export function MarcoMonitores({ children }: { children:React.ReactNode }) {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfil, setPerfil] = useState<UserProfile>(defaultProfile);
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    const refrescar = () => setPerfil(loadProfile());
    refrescar(); applyTheme(loadTheme());
    window.addEventListener(profileEvent, refrescar);
    return () => window.removeEventListener(profileEvent, refrescar);
  }, []);
  useEffect(() => {
    const actualizar = () => setAhora(new Date());
    actualizar(); const reloj = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(reloj);
  }, []);
  const fecha = ahora?.toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) ?? "martes, 25 de agosto de 2026";
  const hora = ahora?.toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }) ?? "08:00:00";
  return <div className="app-shell">
    {menuAbierto && <button className="menu-overlay" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} />}
    <aside className={`sidebar ${menuAbierto ? "is-open" : ""}`} aria-label="Navegación de gestión de monitores">
      <div className="brand"><span className="brand-mark">U</span><span><strong>SGOAS</strong><small>Gestión de Monitores</small></span></div>
      <nav className="nav"><p className="nav-label">Monitores</p>{navegacion.map((item) => <Link key={item.href} href={item.href} className="nav-link" aria-current={ruta === item.href ? "page" : undefined} onClick={() => setMenuAbierto(false)}><span className="nav-icon" aria-hidden="true">•</span>{item.label}</Link>)}</nav>
    </aside>
    <section className="workspace"><header className="topbar"><button className="menu-button" type="button" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>☰</button><span className="period">SEMESTRE 2026-3</span><div className="date-time"><span>{fecha}</span><time dateTime={ahora?.toISOString()}>{hora}</time></div><span className="topbar-spacer" /><Link href="/gestion-monitores/perfil" className="profile"><span className={`avatar ${perfil.photo ? "avatar-has-photo" : ""}`} style={perfil.photo ? { backgroundImage:`url("${perfil.photo}")` } : undefined}>{!perfil.photo && getInitials(perfil.fullName)}</span><span className="profile-copy"><strong>{perfil.fullName}</strong><small>Líder de monitores</small></span></Link></header><main>{children}</main></section>
  </div>;
}
