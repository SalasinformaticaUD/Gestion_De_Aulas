"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation } from "@/config/navigation";

type AppShellProps = { children: React.ReactNode };

const followUp = [
  { href: "/observaciones", label: "Observaciones" },
  { href: "/limpieza", label: "Limpieza" },
  { href: "/tareas", label: "Tareas operativas" },
  { href: "/multas", label: "Multas" },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  const navLink = (href: string, label: string) => (
    <Link href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined} onClick={closeMenu}>
      <span className="nav-icon" aria-hidden="true">•</span>{label}
    </Link>
  );

  return (
    <div className="app-shell">
      {isMenuOpen && <button className="menu-overlay" aria-label="Cerrar menú" onClick={closeMenu} />}
      <aside className={`sidebar ${isMenuOpen ? "is-open" : ""}`} aria-label="Navegación principal">
        <div className="brand"><span className="brand-mark">U</span><span><strong>SGOAS</strong><small>Aulas de Software</small></span></div>
        <nav className="nav">
          <p className="nav-label">Operación</p>
          {navigation.map(({ href, label }) => navLink(href, label))}
          <p className="nav-label">Seguimiento</p>
          {followUp.map(({ href, label }) => navLink(href, label))}
        </nav>
        <div className="sidebar-footer">
          {navLink("/reportes", "Reportes")}
          {navLink("/configuracion", "Configuración")}
          {navLink("/", "Cambiar aplicativo")}
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" type="button" aria-label="Abrir menú" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(true)}>☰</button>
          <span className="period">PERIODO 2026-1</span>
          <div className="date-time"><span>Lunes, 18 de agosto de 2026</span><time>08:00:00</time></div>
          <label className="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Buscar aula, docente, asignatura..." aria-label="Buscar en el sistema" /></label>
          <span className="topbar-spacer" />
          <button className="notification-button" type="button" aria-label="Notificaciones">♢</button>
          <button className="profile" type="button"><span className="avatar">JR</span><span className="profile-copy"><strong>Jhon Rodríguez</strong><small>Técnico · Almacén</small></span></button>
        </header>
        <main>{children}</main>
      </section>
    </div>
  );
}
