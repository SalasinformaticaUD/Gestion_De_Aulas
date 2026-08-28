"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApplication } from "@/features/auth/config/applications";
import { guardarSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas, type RespuestaLoginCentral } from "@/features/monitores/api/clienteMonitores";
import { modoDemoMonitores } from "@/features/monitores/api/modoDemo";
import { CosmosLogo } from "@/components/brand/CosmosLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const credencialesDemoCambioAplicativo = {
  usuario: "demo-cambio-aplicativos",
  contrasena: "demo-cambio-aplicativos",
} as const;

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const application = useMemo(
    () => getApplication(searchParams.get("app")),
    [searchParams],
  );
  const nextPath = searchParams.get("next");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    setUsername("");
    setPassword("");
    setFeedback(null);
    setIsValidating(false);
  }, [application.key]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setFeedback("error");
      setMensajeError("Complete usuario y contraseña para continuar.");
      return;
    }

    setFeedback(null);
    setIsValidating(true);

    try {
      if (modoDemoMonitores) {
        const puedeCambiarAplicativo = username.trim() === credencialesDemoCambioAplicativo.usuario
          && password === credencialesDemoCambioAplicativo.contrasena;
        guardarSesion({
          aplicacion: application.key,
          tokenAcceso: "demo-token",
          expiraEn: Date.now() + 8 * 60 * 60 * 1000,
          modoDemo: true,
          aplicacionesAutorizadas: puedeCambiarAplicativo ? ["aulas", "monitores"] : [application.key],
          usuario: { id:"demo", nombreCompleto:"Usuario Demo", nombreUsuario:username.trim(), correo:"demo@local", cargo:"Líder de monitores", dependencia:{id:"demo",nombre:"Aulas de Software"}, roles:["LIDER"], permisos:["MONITORES_LEER"], modulos:["MONITORES"] },
        });
        setFeedback("success");
        const destino = nextPath?.startsWith("/") ? nextPath : application.destination;
        window.setTimeout(() => router.push(destino), 250);
        return;
      }
      const central = await solicitarAulas<RespuestaLoginCentral>("/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({ identificador: username.trim(), password }),
      });
      const permitido = application.key === "monitores"
        ? central.aplicaciones.puedeAccederMonitores
        : central.aplicaciones.puedeAccederAulas;
      if (!permitido) throw new Error(`Su usuario no tiene permisos para ${application.name}.`);
      const aplicacionesAutorizadas = [
        ...(central.aplicaciones.puedeAccederAulas ? ["aulas" as const] : []),
        ...(central.aplicaciones.puedeAccederMonitores ? ["monitores" as const] : []),
      ];
      // La API de Monitores recibe este mismo token; nunca se reenvían credenciales.
      guardarSesion({ aplicacion:application.key, tokenAcceso:central.accessToken, expiraEn:Date.now() + central.expiresIn * 1000, usuario:central.usuario, aplicacionesAutorizadas });
      setFeedback("success");
      const destino = nextPath?.startsWith("/") ? nextPath : application.destination;
      window.setTimeout(() => router.push(destino), 450);
    } catch (problema) {
      setFeedback("error");
      setMensajeError(problema instanceof Error ? problema.message : "No fue posible iniciar sesión.");
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <main className="auth-page">
      <ThemeToggle />
      <section className="auth-layout" aria-labelledby="login-title">
        <header className="auth-brand">
          <CosmosLogo className="auth-cosmos-logo" priority />
        </header>

        <form className="login-card" onSubmit={submitLogin}>
          <h1 id="login-title">Ingresar a {application.name}</h1>
          <p>{isValidating ? "Validando su información..." : "Por favor, introduzca sus credenciales de acceso institucional."}</p>

          <label className="login-field">
            <span>Usuario</span>
            <input
              autoComplete="username"
              disabled={isValidating}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Ingrese su correo o código"
              type="text"
              value={username}
            />
          </label>

          {!isValidating && (
            <label className="login-field">
              <span>Contraseña</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingrese su contraseña"
                type="password"
                value={password}
              />
            </label>
          )}

          {!isValidating && <button className="login-recovery" type="button">Olvidé mi contraseña</button>}

          <button className="login-submit" disabled={isValidating} type="submit">
            {isValidating ? "◌  Validando..." : "Iniciar sesión"}
          </button>

          {!isValidating && (
            <Link className="login-back" href="/">←&nbsp; Atrás — Selector de Aplicativo</Link>
          )}

          <div className="login-institutional-logo">
            <Image
              alt="Universidad Distrital Francisco José de Caldas"
              height={291}
              src="/brand/universidad-distrital-login.png"
              width={832}
            />
          </div>
        </form>

        {feedback === "success" && (
          <p className="auth-feedback auth-feedback-success" role="status">
            ✓&nbsp;&nbsp; Acceso concedido — Redirigiendo al sistema...
          </p>
        )}
        {feedback === "error" && (
          <p className="auth-feedback auth-feedback-error" role="alert">
            ×&nbsp;&nbsp; {mensajeError}
          </p>
        )}
      </section>
    </main>
  );
}
