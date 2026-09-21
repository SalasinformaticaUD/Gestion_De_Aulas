"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { applications, type ApplicationKey } from "@/features/auth/config/applications";
import { cambiarAplicacionActiva, cerrarSesion, obtenerSesion, tieneAccesoAplicacion } from "@/features/auth/lib/sesion";
import { ErrorApi, eventoErrorAutorizacion, solicitarAulas, solicitarMonitores } from "@/features/monitores/api/clienteMonitores";
import { notify } from "@/lib/notifications";

type AccessGuardProps = { application: ApplicationKey; children: ReactNode };

export function AccessGuard({ application, children }: AccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  useEffect(() => {
    let activo = true;
    setIsAllowed(false);
    const sesion = obtenerSesion();
    if (!sesion) {
      router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!tieneAccesoAplicacion(application, sesion)) {
      const alternativa = sesion.aplicacionesAutorizadas[0];
      router.replace(alternativa ? `${applications[alternativa].destination}?acceso=denegado` : `/login?app=${application}`);
      return;
    }
    cambiarAplicacionActiva(application);
    const milisegundosRestantes = sesion.expiraEn - Date.now();
    if (milisegundosRestantes <= 0) {
      cerrarSesion();
      router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
      return;
    }
    const temporizadorExpiracion = window.setTimeout(() => {
      cerrarSesion();
      router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
    }, milisegundosRestantes);
    const validarSesion = async () => {
      if (application === "monitores") {
        const clavePuente = `sgoas:monitores-sesion:${sesion.usuario.id}:${sesion.expiraEn}`;
        const prepararPuente = async () => {
          await solicitarAulas("/integraciones/monitores/sesion", sesion.tokenAcceso, { method: "POST" });
          await solicitarMonitores("/api/v1/platform/handoff-admin/", { method: "POST", notificarAutorizacion: false });
          window.sessionStorage.setItem(clavePuente, "activa");
        };
        if (sesion.tokenAcceso) {
          // La sesión de Django se crea una sola vez por sesión central. Esto
          // evita repetir el traspaso al recorrer cada página de Monitores.
          if (!window.sessionStorage.getItem(clavePuente)) await prepararPuente();
          try {
            await solicitarMonitores("/api/v1/auth/me/", { notificarAutorizacion: false });
          } catch (error) {
            // Puede perderse únicamente la cookie local (por reinicio del
            // servicio). Se reconstruye una vez sin cerrar la sesión central.
            if (!(error instanceof ErrorApi) || error.estado !== 401) throw error;
            window.sessionStorage.removeItem(clavePuente);
            await prepararPuente();
          }
          return;
        }
        await solicitarMonitores("/api/v1/auth/me/", { notificarAutorizacion: false });
        return;
      }
      await solicitarAulas("/auth/me", sesion.tokenAcceso);
    };
    validarSesion()
      .then(() => { if (activo) setIsAllowed(true); })
      .catch((error: unknown) => {
        if (!activo) return;
        if (error instanceof ErrorApi && error.estado === 403) {
          const alternativa = sesion.aplicacionesAutorizadas[0];
          router.replace(alternativa ? `${applications[alternativa].destination}?acceso=denegado` : `/login?app=${application}`);
          return;
        }
        // Solo una respuesta 401 confirma que el token ya no es válido. Los
        // límites de tasa, caídas temporales y fallas de red no deben cerrar
        // una sesión central que todavía puede recuperarse.
        if (error instanceof ErrorApi && error.estado === 401) {
          cerrarSesion();
          router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
          return;
        }
        const mensaje = error instanceof ErrorApi && error.estado === 429
          ? "La API está regulando temporalmente las solicitudes. La sesión sigue activa; espere unos segundos y vuelva a intentar."
          : "No fue posible validar la conexión con el servicio. La sesión sigue activa; vuelva a intentar en unos segundos.";
        notify({ tone: "error", message: mensaje });
        setIsAllowed(true);
      });
    return () => { activo = false; window.clearTimeout(temporizadorExpiracion); };
  }, [application, pathname, router]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("acceso") === "denegado") {
      notify({ tone: "error", message: "Acceso denegado: no tiene permiso para abrir ese aplicativo." });
      router.replace(pathname);
    }
  }, [pathname, router]);

  useEffect(() => {
    const manejarError = (event: Event) => {
      const estado = (event as CustomEvent<{ estado?: number }>).detail?.estado;
      const sesion = obtenerSesion();
      if (estado === 401) {
        cerrarSesion();
        router.replace(`/login?app=${application}`);
      }
      if (estado === 403 && sesion) {
        const alternativa = sesion.aplicacionesAutorizadas[0];
        router.replace(alternativa ? `${applications[alternativa].destination}?acceso=denegado` : `/login?app=${application}`);
      }
    };
    window.addEventListener(eventoErrorAutorizacion, manejarError);
    return () => window.removeEventListener(eventoErrorAutorizacion, manejarError);
  }, [application, router]);

  if (!isAllowed) return <main className="access-guard-loading">Verificando acceso...</main>;
  return <>{children}</>;
}
