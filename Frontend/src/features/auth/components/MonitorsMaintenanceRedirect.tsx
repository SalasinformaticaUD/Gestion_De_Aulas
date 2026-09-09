"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LEGACY_MONITORS_URL } from "@/features/auth/config/applications";

const REDIRECT_DELAY_SECONDS = 4;

export function MonitorsMaintenanceRedirect() {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY_SECONDS);

  useEffect(() => {
    const redirect = window.setTimeout(() => window.location.assign(LEGACY_MONITORS_URL), REDIRECT_DELAY_SECONDS * 1000);
    const countdown = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      window.clearTimeout(redirect);
      window.clearInterval(countdown);
    };
  }, []);

  return (
    <main className="auth-page maintenance-page">
      <ThemeToggle />
      <section className="maintenance-card" aria-labelledby="maintenance-title">
        <span className="maintenance-icon" aria-hidden="true">◌</span>
        <p className="maintenance-label">Mantenimiento temporal</p>
        <h1 id="maintenance-title">Gestión de Monitores está en mantenimiento</h1>
        <p>Mientras finalizamos los ajustes, será redirigido al aplicativo anterior.</p>
        <a className="login-submit maintenance-action" href={LEGACY_MONITORS_URL}>Ir ahora al aplicativo de Monitores</a>
        <small>Redirección automática en {secondsLeft} segundo{secondsLeft === 1 ? "" : "s"}.</small>
        <Link className="login-back" href="/">← Volver al selector de aplicativos</Link>
      </section>
    </main>
  );
}
