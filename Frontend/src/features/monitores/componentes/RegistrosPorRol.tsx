"use client";

import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "./SistemaVisualMonitores.module.css";
import { ImportarRegistros } from "./ImportarRegistros";
import { RegistrosPersonales } from "./RegistrosPersonales";

export function RegistrosPorRol() {
  const perfil = usarRecursoApi(servicioMonitores.obtenerPerfilMonitores, { role: "" });
  if (perfil.cargando) return <p className={estilos.vacio}>Cargando registros…</p>;
  if (perfil.error) return <div className={`${estilos.aviso} ${estilos.avisoError}`}>{perfil.error}</div>;
  return String(perfil.datos.role).trim().toLowerCase() === "monitor" ? <RegistrosPersonales /> : <ImportarRegistros />;
}