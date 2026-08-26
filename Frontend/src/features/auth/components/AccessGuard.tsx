"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { ApplicationKey } from "@/features/auth/config/applications";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

type AccessGuardProps = { application: ApplicationKey; children: ReactNode };

export function AccessGuard({ application, children }: AccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  useEffect(() => {
    let activo = true;
    const sesion = obtenerSesion();
    if (!sesion || sesion.aplicacion !== application) {
      router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (sesion.modoDemo) { setIsAllowed(true); return; }
    solicitarAulas("/auth/me", sesion.tokenAcceso)
      .then(() => { if (activo) setIsAllowed(true); })
      .catch(() => router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`));
    return () => { activo = false; };
  }, [application, pathname, router]);
  return isAllowed ? <>{children}</> : <main className="access-guard-loading">Verificando acceso...</main>;
}
