"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { applications } from "@/features/auth/config/applications";
import { cambiarAplicacionActiva, eventoSesion, obtenerSesion, tieneAccesoAplicacion, type SesionAplicacion } from "@/features/auth/lib/sesion";
import { UniversityLogo } from "@/components/brand/UniversityLogo";
import { CosmosLogo } from "@/components/brand/CosmosLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function ApplicationSelectorPage() {
  const [sesion, setSesion] = useState<SesionAplicacion | null | undefined>(undefined);
  useEffect(() => {
    const actualizar = () => setSesion(obtenerSesion());
    actualizar();
    window.addEventListener(eventoSesion, actualizar);
    window.addEventListener("storage", actualizar);
    return () => { window.removeEventListener(eventoSesion, actualizar); window.removeEventListener("storage", actualizar); };
  }, []);
  const tieneAcceso = (aplicacion: "aulas" | "monitores") => Boolean(sesion && tieneAccesoAplicacion(aplicacion, sesion));
  const destino = (aplicacion: "aulas" | "monitores") => tieneAcceso(aplicacion) ? applications[aplicacion].destination : applications[aplicacion].loginPath;
  const seleccionar = (aplicacion: "aulas" | "monitores") => {
    if (tieneAcceso(aplicacion)) cambiarAplicacionActiva(aplicacion);
  };
  return (
    <main className="app-selector">
      <ThemeToggle />
      <div className="selector-background" aria-hidden="true" />

      <section className="selector-panel" aria-labelledby="selector-title">
        <header className="selector-header">
          <UniversityLogo className="selector-logo" priority />
          <CosmosLogo className="cosmos-logo selector-cosmos-logo-light" priority />
          <CosmosLogo className="cosmos-logo selector-cosmos-logo-dark" variant="light" priority />
        </header>


        <div className="selector-copy">
          <h1 id="selector-title">Seleccione el sistema al que desea acceder</h1>
          <p>Sistemas de control centralizado para Laboratorios de Ingeniería</p>
        </div>

        <div className="application-grid">
          <Link className="application-card" href={destino("aulas")} onClick={() => seleccionar("aulas")}>
            <span className="application-icon" aria-hidden="true">♧</span>
            <span className="application-content">
              <strong>{applications.aulas.name}</strong>
              <span>{applications.aulas.description}</span>
            </span>
            <span className="application-action">Ingresar <span aria-hidden="true">→</span></span>
          </Link>

          <Link className="application-card" href={destino("monitores")} onClick={() => seleccionar("monitores")}>
            <span className="application-icon application-icon-monitors" aria-hidden="true">♧</span>
            <span className="application-content">
              <strong>{applications.monitores.name}</strong>
              <span>{applications.monitores.description}</span>
            </span>
            <span className="application-action">Ingresar <span aria-hidden="true">→</span></span>
          </Link>
        </div>

        <footer className="selector-footer">
          <span>Universidad Distrital · Facultad de Ingeniería de Sistemas y Software</span>
        </footer>
      </section>
    </main>
  );
}
