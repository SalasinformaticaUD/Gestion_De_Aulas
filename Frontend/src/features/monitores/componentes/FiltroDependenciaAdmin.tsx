"use client";

import { useEffect, useState } from "react";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";

export const dependenciasMonitores = [
  ["informatics_labs", "Monitores Aulas de Software"],
  ["electrical", "Monitores Laboratorios"],
  ["physics", "Monitores Física"],
] as const;

export function useFiltroDependenciaAdmin() {
  const [rol, setRol] = useState<string | null>(null);
  const [dependencia, setDependencia] = useState("");
  useEffect(() => {
    let vigente = true;
    void servicioMonitores.obtenerPerfilMonitores().then((perfil) => {
      if (!vigente) return;
      setRol(perfil.role);
      if (perfil.role !== "admin" && perfil.department) setDependencia(perfil.department);
    }).catch(() => { if (vigente) setRol(null); });
    return () => { vigente = false; };
  }, []);
  return { esAdministrador: rol === "admin", dependencia, setDependencia, rol };
}

export function SelectorDependenciaAdmin({
  visible,
  value,
  onChange,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!visible) return null;
  return <label className="campo-filtro-dependencia"><span>Dependencia</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Todas las dependencias</option>{dependenciasMonitores.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}</select></label>;
}