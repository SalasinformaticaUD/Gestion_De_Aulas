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

type AuthMode = "login" | "request-recovery" | "reset-password";

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const application = useMemo(
    () => getApplication(searchParams.get("app")),
    [searchParams],
  );
  const nextPath = searchParams.get("next");
  const resetUid = searchParams.get("reset_uid") ?? "";
  const resetToken = searchParams.get("reset_token") ?? "";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [studentCode, setStudentCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    setUsername("");
    setPassword("");
    setStudentCode("");
    setNewPassword("");
    setConfirmPassword("");
    setFeedback(null);
    setMensajeError("");
    setIsValidating(false);
    setAuthMode(
      application.key === "monitores" && resetUid && resetToken
        ? "reset-password"
        : "login",
    );
  }, [application.key, resetToken, resetUid]);

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
    setMensajeError("");
    setIsValidating(true);

    try {
      const identificador = username.trim();
      const iniciarSesionCentral = async () => {
        const central = await solicitarAulas<RespuestaLoginCentral>("/auth/login", undefined, {
          method: "POST",
          body: JSON.stringify({ identificador, password }),
        });
        const permitido = application.key === "monitores"
          ? central.aplicaciones.puedeAccederMonitores
          : central.aplicaciones.puedeAccederAulas;
        if (!permitido) throw new Error(`Su usuario no tiene permisos para ${application.name}.`);
        if (
          application.key === "monitores"
          && central.usuario.nombreUsuario.toLocaleLowerCase() !== identificador.toLocaleLowerCase()
        ) {
          throw new Error("Los líderes deben ingresar con su nombre de usuario.");
        }
        if (application.key === "monitores") {
          await solicitarAulas("/integraciones/monitores/sesion", central.accessToken, { method: "POST" });
        }
        const aplicacionesAutorizadas = [
          ...(central.aplicaciones.puedeAccederAulas ? ["aulas" as const] : []),
          ...(central.aplicaciones.puedeAccederMonitores ? ["monitores" as const] : []),
        ];
        guardarSesion({ aplicacion: application.key, tokenAcceso: central.accessToken, origen: "central", expiraEn: Date.now() + central.expiresIn * 1000, usuario: central.usuario, aplicacionesAutorizadas });
      };

      const iniciarSesionLocalMonitores = async () => {
        const local = await solicitarMonitores<RespuestaLoginMonitores>("/api/v1/auth/login/", {
          method: "POST",
          body: JSON.stringify({ username: identificador, password }),
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
      };

      if (application.key === "monitores") {
        try {
          await iniciarSesionLocalMonitores();
        } catch (problemaLocal) {
          const credencialesLocalesInvalidas = problemaLocal instanceof ErrorApi
            && [400, 401].includes(problemaLocal.estado);
          const puedeSerUsuarioCentral = !identificador.includes("@") && !/^\d+$/.test(identificador);
          if (!credencialesLocalesInvalidas || !puedeSerUsuarioCentral) throw problemaLocal;
          await iniciarSesionCentral();
        }
      } else {
        await iniciarSesionCentral();
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

  async function requestPasswordRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{3,20}$/.test(studentCode.trim())) {
      setFeedback("error");
      setMensajeError("Ingrese un código estudiantil válido, usando solo números.");
      return;
    }
    setFeedback(null);
    setIsValidating(true);
    try {
      const result = await solicitarMonitores<{ detail: string; correo_destino?: string }>(
        "/api/v1/auth/password-recovery/request/",
        {
          method: "POST",
          body: JSON.stringify({ codigo_estudiante: studentCode.trim() }),
          notificarAutorizacion: false,
        },
      );
      setFeedback("success");
      setMensajeError(
        result.correo_destino
          ? `Enviamos las instrucciones a ${result.correo_destino}. Revisa también la carpeta de correo no deseado.`
          : result.detail,
      );
    } catch (problema) {
      setFeedback("error");
      setMensajeError(problema instanceof Error ? problema.message : "No fue posible solicitar la recuperación.");
    } finally {
      setIsValidating(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 10) {
      setFeedback("error");
      setMensajeError("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback("error");
      setMensajeError("Las contraseñas no coinciden.");
      return;
    }
    setFeedback(null);
    setIsValidating(true);
    try {
      await solicitarMonitores<{ detail: string }>(
        "/api/v1/auth/password-recovery/confirm/",
        {
          method: "POST",
          body: JSON.stringify({ uid: resetUid, token: resetToken, nueva_contrasena: newPassword }),
          notificarAutorizacion: false,
        },
      );
      setNewPassword("");
      setConfirmPassword("");
      setAuthMode("login");
      setFeedback("success");
      setMensajeError("Contraseña actualizada. Ya puede ingresar con su código estudiantil.");
      router.replace("/login?app=monitores");
    } catch (problema) {
      setFeedback("error");
      setMensajeError(problema instanceof Error ? problema.message : "No fue posible cambiar la contraseña.");
    } finally {
      setIsValidating(false);
    }
  }

  const formSubmit = authMode === "login"
    ? submitLogin
    : authMode === "request-recovery"
      ? requestPasswordRecovery
      : resetPassword;
  const title = authMode === "login"
    ? `Ingresar a ${application.name}`
    : authMode === "request-recovery"
      ? "Recuperar contraseña"
      : "Crear nueva contraseña";
  const description = isValidating
    ? "Procesando su solicitud..."
    : authMode === "login"
      ? "Por favor, introduzca sus credenciales de acceso institucional."
      : authMode === "request-recovery"
        ? "Confirme su código estudiantil. Enviaremos las instrucciones al correo registrado."
        : "Ingrese y confirme la nueva contraseña para su cuenta de monitor.";

  return (
    <main className="auth-page">
      <ThemeToggle />
      <section className="auth-layout" aria-labelledby="login-title">
        <header className="auth-brand">
          <CosmosLogo className="auth-cosmos-logo auth-cosmos-logo-light" priority />
          <CosmosLogo className="auth-cosmos-logo auth-cosmos-logo-dark" variant="light" priority />
        </header>

        <form className="login-card" onSubmit={formSubmit}>
          <h1 id="login-title">{title}</h1>
          <p>{description}</p>

          {authMode === "login" && <label className="login-field">
            <span>{application.key === "monitores" ? "Código o usuario" : "Usuario"}</span>
            <input
              autoComplete="username"
              disabled={isValidating}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={application.key === "monitores" ? "Código estudiantil o usuario de líder" : "Ingrese su usuario o correo"}
              type="text"
              value={username}
            />
          </label>}

          {authMode === "login" && !isValidating && (
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

          {authMode === "request-recovery" && (
            <label className="login-field">
              <span>Código estudiantil</span>
              <input
                autoComplete="username"
                autoFocus
                disabled={isValidating}
                inputMode="numeric"
                onChange={(event) => setStudentCode(event.target.value.replace(/\D/g, ""))}
                placeholder="Ej. 20211001001"
                value={studentCode}
              />
            </label>
          )}

          {authMode === "reset-password" && !isValidating && <>
            <label className="login-field">
              <span>Nueva contraseña</span>
              <input autoComplete="new-password" autoFocus minLength={10} onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
            </label>
            <label className="login-field">
              <span>Confirmar nueva contraseña</span>
              <input autoComplete="new-password" minLength={10} onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
            </label>
          </>}

          {authMode === "login" && application.key === "monitores" && !isValidating && <button className="login-recovery" type="button" onClick={() => { setAuthMode("request-recovery"); setFeedback(null); setMensajeError(""); }}>Olvidé mi contraseña</button>}

          <button className="login-submit" disabled={isValidating} type="submit">
            {isValidating
              ? "◌  Procesando..."
              : authMode === "login"
                ? "Iniciar sesión"
                : authMode === "request-recovery"
                  ? "Enviar instrucciones"
                  : "Cambiar contraseña"}
          </button>

          {authMode !== "login" && !isValidating && (
            <button className="login-back login-back-button" type="button" onClick={() => { setAuthMode("login"); setFeedback(null); setMensajeError(""); router.replace("/login?app=monitores"); }}>←&nbsp; Volver al inicio de sesión</button>
          )}

          {authMode === "login" && !isValidating && (
            <Link className="login-back" href="/">←&nbsp; Atrás — Selector de Aplicativo</Link>
          )}

          <div className="login-institutional-logo"><UniversityLogo priority /></div>
        </form>

        {feedback === "success" && (
          <p className="auth-feedback auth-feedback-success" role="status">
            ✓&nbsp;&nbsp; {mensajeError || "Acceso concedido — Redirigiendo al sistema..."}
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
