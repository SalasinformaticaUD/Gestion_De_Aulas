"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { followUpNavigation, operationNavigation } from "@/config/navigation";
import { applyTheme, defaultProfile, getInitials, loadProfile, loadTheme, profileEvent, type UserProfile } from "@/features/perfil/lib/profile";

type AppShellProps = { children: React.ReactNode };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>(defaultProfile);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const refreshProfile = () => setProfileData(loadProfile());
    refreshProfile();
    applyTheme(loadTheme());
    window.addEventListener(profileEvent, refreshProfile);
    return () => window.removeEventListener(profileEvent, refreshProfile);
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
          {operationNavigation.map(({ href, label }) => navLink(href, label))}
          <p className="nav-label">Seguimiento</p>
          {followUpNavigation.map(({ href, label }) => navLink(href, label))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" type="button" aria-label="Abrir menú" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(true)}>☰</button>
          <span className="period">2026-3</span>
          <div className="date-time"><span>{formattedDate}</span><time dateTime={currentDate?.toISOString()}>{formattedTime}</time></div>
          <label className="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Buscar aula, docente, asignatura..." aria-label="Buscar en el sistema" /></label>
          <span className="topbar-spacer" />
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
