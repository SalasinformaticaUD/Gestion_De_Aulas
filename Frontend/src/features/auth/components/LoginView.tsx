"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApplication } from "@/features/auth/config/applications";
import { saveDemoSession } from "@/features/auth/lib/session";

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

  useEffect(() => {
    setUsername("");
    setPassword("");
    setFeedback(null);
    setIsValidating(false);
  }, [application.key]);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setFeedback("error");
      return;
    }

    setFeedback(null);
    setIsValidating(true);

    window.setTimeout(() => {
      setIsValidating(false);
      setFeedback("success");
      saveDemoSession({ application: application.key, username: username.trim() });

      window.setTimeout(() => {
        if (application.key === "monitores") {
          window.location.assign(application.destination);
          return;
        }
        router.push(nextPath?.startsWith("/") ? nextPath : application.destination);
      }, 900);
    }, 850);
  }

  return (
    <main className="auth-page">
      <section className="auth-layout" aria-labelledby="login-title">
        <header className="auth-brand">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>COSMOS</strong>
            <small>PLATAFORMA DE GESTIÓN</small>
          </div>
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
        </form>

        {feedback === "success" && (
          <p className="auth-feedback auth-feedback-success" role="status">
            ✓&nbsp;&nbsp; Acceso concedido — Redirigiendo al sistema...
          </p>
        )}
        {feedback === "error" && (
          <p className="auth-feedback auth-feedback-error" role="alert">
            ×&nbsp;&nbsp; Complete usuario y contraseña para continuar.
          </p>
        )}
      </section>
    </main>
  );
}
