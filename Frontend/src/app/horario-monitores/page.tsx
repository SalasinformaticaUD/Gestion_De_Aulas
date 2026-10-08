"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerSesion, tienePermiso } from "@/features/auth/lib/sesion";
import { MarcoMonitores } from "@/features/monitores/componentes/MarcoMonitores";
import { PanelMonitoresDependencias } from "@/features/monitores/componentes/PanelMonitoresDependencias";

export default function HorarioMonitoresPage() {
  const router = useRouter();
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    if (tienePermiso("DASHBOARD_VER_HORARIO_MONITORES", obtenerSesion())) {
      setPermitido(true);
      return;
    }
    router.replace("/gestion-aulas?acceso=denegado");
  }, [router]);

  if (!permitido) return <main className="access-guard-loading">Verificando permiso…</main>;
  return <MarcoMonitores><PanelMonitoresDependencias modoHorarioAulas /></MarcoMonitores>;
}
