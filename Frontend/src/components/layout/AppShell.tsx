"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { followUpNavigation, operationNavigation } from "@/config/navigation";
import { UniversityLogo } from "@/components/brand/UniversityLogo";
import { applyTheme, defaultProfile, getInitials, loadProfile, loadTheme, profileEvent, profileFromSession, type UserProfile } from "@/features/perfil/lib/profile";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ModuleSwitcher } from "@/components/layout/ModuleSwitcher";
import { cerrarSesion, eventoSesion, obtenerSesion } from "@/features/auth/lib/sesion";

type AppShellProps = { children: React.ReactNode };

const moduleByRoute: Record<string, string> = {
  "/gestion-aulas": "DASHBOARD",
  "/horarios": "HORARIOS",
  "/aulas": "AULAS",
  "/disponibilidad": "DISPONIBILIDAD",
  "/practicas-libres": "PRACTICAS_LIBRES",
  "/prestamos-docentes": "PRESTAMOS_DOCENTES",
  "/audiovisuales": "AUDIOVISUALES",
  "/software": "SOFTWARE",
  "/credenciales": "CREDENCIALES",
  "/usuarios": "ADMINISTRACION",
  "/estudiantes": "ESTUDIANTES",
  "/docentes": "DOCENTES",
  "/observaciones": "OBSERVACIONES",
  "/limpieza": "LIMPIEZA",
  "/tareas": "TAREAS",
  "/multas": "MULTAS",
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>(defaultProfile);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 820px)").matches) {
      setIsMenuOpen((open) => !open);
      return;
    }
    setIsSidebarCollapsed((collapsed) => !collapsed);
  };
  const salir = () => {
    cerrarSesion();
    closeMenu();
    window.location.assign("/");
  };

  useEffect(() => {
    const refreshProfile = () => {
      const user = obtenerSesion()?.usuario;
      setProfileData(user ? profileFromSession(user, loadProfile(user.id)) : defaultProfile);
    };
    refreshProfile();
    applyTheme(loadTheme());
    window.addEventListener(profileEvent, refreshProfile);
    window.addEventListener(eventoSesion, refreshProfile);
    return () => {
      window.removeEventListener(profileEvent, refreshProfile);
      window.removeEventListener(eventoSesion, refreshProfile);
    };
  }, []);

  useEffect(() => {
    const refreshAccess = () => {
      const session = obtenerSesion();
      setIsAdministrator(session?.usuario.roles.some((rol) => rol.trim().toUpperCase() === "ADMINISTRADOR") ?? false);
      setAllowedModules(session?.usuario.modulos.map((module) => module.toUpperCase()) ?? []);
    };
    refreshAccess();
    window.addEventListener(eventoSesion, refreshAccess);
    return () => window.removeEventListener(eventoSesion, refreshAccess);
  }, []);

  useEffect(() => {
    const refreshClock = () => setCurrentDate(new Date());
    refreshClock();
    const clock = window.setInterval(refreshClock, 1000);
    return () => window.clearInterval(clock);
  }, []);

  const formattedDate = currentDate?.toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }) ?? "Martes, 25 de agosto de 2026";
  const formattedTime = currentDate?.toLocaleTimeString("es-CO", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }) ?? "08:00:00";

  const navLink = (href: string, label: string) => (
    <Link key={href} href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined} onClick={closeMenu}>
      <span className="nav-icon" aria-hidden="true">•</span>{label}
    </Link>
  );
  const canAccessRoute = (href: string) => {
    const module = moduleByRoute[href];
    return !module || allowedModules.includes(module);
  };

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {isMenuOpen && <button className="menu-overlay" aria-label="Cerrar menú" onClick={closeMenu} />}
      <aside className={`sidebar ${isMenuOpen ? "is-open" : ""} ${isSidebarCollapsed ? "is-collapsed" : ""}`} aria-label="Navegación principal">
        <Link href="/gestion-aulas" className="brand" aria-label="Ir al dashboard" onClick={closeMenu}><Image className="sidebar-aulas-logo" src="/brand/Logo_Cosmos_Aulas_de_Software.png" alt="COSMOS · Aulas de Software" width={1920} height={1080} priority /></Link>
        <nav className="nav">
          <p className="nav-label">Operación</p>
          {operationNavigation.filter(({ href }) => canAccessRoute(href) && (href !== "/usuarios" || isAdministrator)).map(({ href, label }) => navLink(href, label))}
          <p className="nav-label">Seguimiento</p>
          {followUpNavigation.filter(({ href }) => canAccessRoute(href)).map(({ href, label }) => navLink(href, label))}
        </nav>
        <footer className="sidebar-footer">
          <ModuleSwitcher current="aulas" onNavigate={closeMenu} />
          <button type="button" className="nav-link nav-logout" onClick={salir}><span className="nav-icon" aria-hidden="true">↪</span>Salir</button>
        </footer>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" type="button" aria-label={isSidebarCollapsed ? "Mostrar panel de módulos" : "Ocultar panel de módulos"} aria-expanded={!isSidebarCollapsed} onClick={toggleSidebar}>☰</button>
          <span className="period">2026-3</span>
          <div className="date-time"><span>{formattedDate}</span><time dateTime={currentDate?.toISOString()}>{formattedTime}</time></div>
          <span className="topbar-spacer" />
          <ThemeToggle />
          <Link href="/perfil" className="profile" aria-current={pathname === "/perfil" ? "page" : undefined}>
            <span className={`avatar ${profileData.photo ? "avatar-has-photo" : ""}`} style={profileData.photo ? { backgroundImage: `url("${profileData.photo}")` } : undefined}>{!profileData.photo && getInitials(profileData.fullName)}</span>
            <span className="profile-copy"><strong>{profileData.fullName}</strong><small>{profileData.role}</small></span>
          </Link>
        </header>
        <main>{children}</main>
      </section>
    </div>
  );
}
