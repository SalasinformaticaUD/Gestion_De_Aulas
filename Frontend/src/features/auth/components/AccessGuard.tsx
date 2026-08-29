"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { applications, type ApplicationKey } from "@/features/auth/config/applications";
import { cerrarSesion, obtenerSesion, tieneAccesoAplicacion } from "@/features/auth/lib/sesion";
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
      router.replace(`${applications[sesion.aplicacion].destination}?acceso=denegado`);
      return;
    }
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
      await solicitarAulas("/auth/me", sesion.tokenAcceso);
      // Monitores mantiene su perfil operativo local y debe confirmar que el UUID
      // del JWT central está vinculado a un usuario activo en esa aplicación.
      if (application === "monitores") {
        await solicitarMonitores("/api/v1/platform/me/");
      }
    };
    validarSesion()
      .then(() => { if (activo) setIsAllowed(true); })
      .catch((error: unknown) => {
        if (error instanceof ErrorApi && error.estado === 403) {
          router.replace(`${applications[sesion.aplicacion].destination}?acceso=denegado`);
          return;
        }
        cerrarSesion();
        router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
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
      if (estado === 403 && sesion) router.replace(`${applications[sesion.aplicacion].destination}?acceso=denegado`);
    };
    window.addEventListener(eventoErrorAutorizacion, manejarError);
    return () => window.removeEventListener(eventoErrorAutorizacion, manejarError);
  }, [application, router]);

  if (!isAllowed) return <main className="access-guard-loading">Verificando acceso...</main>;
  return <>{children}</>;
}
