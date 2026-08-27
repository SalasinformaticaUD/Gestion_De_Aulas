import Link from "next/link";
import { applications } from "@/features/auth/config/applications";
import { UniversityLogo } from "@/components/brand/UniversityLogo";
import { CosmosLogo } from "@/components/brand/CosmosLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function ApplicationSelectorPage() {
  return (
    <main className="app-selector">
      <ThemeToggle />
      <div className="selector-background" aria-hidden="true" />

      <section className="selector-panel" aria-labelledby="selector-title">
        <header className="selector-header">
          <UniversityLogo className="selector-logo" priority />
          <CosmosLogo className="cosmos-logo" priority />
        </header>


        <div className="selector-copy">
          <h1 id="selector-title">Seleccione el sistema al que desea acceder</h1>
          <p>Sistemas de control centralizado para Laboratorios de Ingeniería</p>
        </div>

        <div className="application-grid">
          <Link className="application-card" href={applications.aulas.loginPath}>
            <span className="application-icon" aria-hidden="true">♧</span>
            <span className="application-content">
              <strong>{applications.aulas.name}</strong>
              <span>{applications.aulas.description}</span>
            </span>
            <span className="application-action">Ingresar <span aria-hidden="true">→</span></span>
          </Link>

          <Link className="application-card" href={applications.monitores.loginPath}>
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
