"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarMonitores } from "@/features/monitores/api/clienteMonitores";
import { ReportesApiView } from "@/features/monitores/componentes/ReportesApiView";

export default function PaginaActas() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    let vigente = true;
    void solicitarMonitores<{ role: string; monitor_is_current: boolean | null }>("/api/v1/auth/me/")
      .then((perfil) => {
        if (!vigente) return;
        const esMonitor = perfil.role.trim().toLowerCase() === "monitor";
        if (esMonitor && perfil.monitor_is_current !== true) {
          router.replace("/gestion-monitores/registros");
          return;
        }
        setAutorizado(true);
      })
      .catch(() => router.replace("/gestion-monitores"));
    return () => { vigente = false; };
  }, [router]);

  if (!autorizado) return <p>Cargando permisos…</p>;
  return <ReportesApiView tipo="actas" />;
}
