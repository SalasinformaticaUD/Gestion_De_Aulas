"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { applications, type ApplicationKey } from "@/features/auth/config/applications";
import { cambiarAplicacionActiva, cerrarSesion, guardarSesion, obtenerSesion, tieneAccesoAplicacion } from "@/features/auth/lib/sesion";
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
    const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim().toUpperCase();
    const perfiles = [...(sesion.usuario.roles ?? []), sesion.usuario.cargo ?? ""].map(normalizar);
    const esAdmin = perfiles.some((perfil) => perfil === "ADMIN" || perfil === "ADMINISTRADOR" || (perfil.includes("ADMIN") && perfil.includes("MONITOR")));
    const esLiderAulasSoftware = perfiles.some((perfil) => perfil.includes("LIDER") || perfil.includes("LEADER")) && [sesion.usuario.dependencia?.id, sesion.usuario.dependencia?.nombre, ...perfiles].some((valor) => { const dependencia = normalizar(valor ?? ""); return dependencia === "INFORMATICS_LABS" || dependencia.includes("INFORMATICS") || dependencia.includes("AULAS DE SOFTWARE"); });
    const esSesionCentral = sesion.origen !== "monitores-local";
    const puedeAccederAulasPorRol = application === "aulas" && esSesionCentral && Boolean(sesion.tokenAcceso) && (esAdmin || esLiderAulasSoftware);
    if (!tieneAccesoAplicacion(application, sesion) && !puedeAccederAulasPorRol) {
      const alternativa = sesion.aplicacionesAutorizadas[0];
      router.replace(alternativa ? `${applications[alternativa].destination}?acceso=denegado` : `/login?app=${application}`);
      return;
    }
    if (puedeAccederAulasPorRol && !tieneAccesoAplicacion(application, sesion)) {
      guardarSesion({ ...sesion, aplicacion: application, aplicacionesAutorizadas: [...new Set([...sesion.aplicacionesAutorizadas, application])] });
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
        // Cada petición lleva el token propio de la pestaña. No se abre una
        // sesión Django mediante cookie, porque las cookies se comparten entre
        // pestañas y podrían sustituir la identidad de otro usuario.
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
