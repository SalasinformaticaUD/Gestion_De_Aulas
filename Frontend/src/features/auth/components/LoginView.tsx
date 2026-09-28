"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApplication } from "@/features/auth/config/applications";
import { cambiarAplicacionActiva, guardarSesion, obtenerSesion, tieneAccesoAplicacion } from "@/features/auth/lib/sesion";
import { ErrorApi, solicitarAulas, solicitarMonitores, type RespuestaLoginCentral, type RespuestaLoginMonitores } from "@/features/monitores/api/clienteMonitores";
import { CosmosLogo } from "@/components/brand/CosmosLogo";
import { UniversityLogo } from "@/components/brand/UniversityLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!tieneAccesoAplicacion(application.key, sesion)) return;
    cambiarAplicacionActiva(application.key);
    const destino = nextPath?.startsWith("/") ? nextPath : application.destination;
    router.replace(destino);
  }, [application.key, nextPath, router, application.destination]);

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
      const iniciarSesionCentral = async () => {
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
        guardarSesion({ aplicacion: application.key, tokenAcceso: central.accessToken, origen: "central", expiraEn: Date.now() + central.expiresIn * 1000, usuario: central.usuario, aplicacionesAutorizadas });
      };

      try {
        // La cuenta central es la fuente de identidad para ambos aplicativos.
        // Así, ingresar desde Monitores funciona igual que ingresar desde Aulas.
        await iniciarSesionCentral();
      } catch (problemaCentral) {
        // Se conserva el acceso de las cuentas históricas que únicamente
        // existen en Monitores. Otros errores (incluido 429) no deben generar
        // un segundo intento ni ocultar el diagnóstico recibido.
        if (application.key !== "monitores" || !(problemaCentral instanceof ErrorApi) || problemaCentral.estado !== 401) throw problemaCentral;
        const local = await solicitarMonitores<RespuestaLoginMonitores>("/api/v1/auth/login/", {
          method: "POST",
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const nombreCompleto = `${local.first_name} ${local.last_name}`.trim() || local.username;
        guardarSesion({
          aplicacion: "monitores",
          tokenAcceso: local.access_token,
          origen: "monitores-local",
          expiraEn: Date.now() + local.expires_in * 1000,
          usuario: {
            id: local.id,
            nombreCompleto,
            nombreUsuario: local.username,
            correo: local.email,
            fotoPerfil: null,
            cargo: null,
            dependencia: local.department ? { id: local.department, nombre: local.department } : null,
            roles: [local.role],
            permisos: [],
            modulos: ["MONITORES"],
          },
          aplicacionesAutorizadas: ["monitores"],
        });
      }
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
          <CosmosLogo className="auth-cosmos-logo auth-cosmos-logo-light" priority />
          <CosmosLogo className="auth-cosmos-logo auth-cosmos-logo-dark" variant="light" priority />
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

          <div className="login-institutional-logo"><UniversityLogo priority /></div>
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
