import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type Persona = {
  id: string;
  codigo?: string;
  documento?: string | null;
  nombre: string;
  correo?: string | null;
  proyecto?: string | null;
};

type TipoPersona = "estudiantes" | "docentes";
type DatosPersona = { codigo?: string; documento?: string; nombre: string; correo?: string; proyecto?: string };
type ResultadoImportacion = { total: number; procesados?: number; omitidasDuplicadas?: number; creados: number; actualizados: number; eliminados: number; conservadosPorHistorial: number };

function token() {
  const value = obtenerSesion()?.tokenAcceso;
  if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return value;
}

export function listarPersonas(tipo: TipoPersona, query = "") {
  const suffix = query ? "?q=" + encodeURIComponent(query) : "";
  return solicitarAulas<Persona[]>("/" + tipo + suffix, token());
}

export function crearPersona(tipo: TipoPersona, data: DatosPersona) {
  return solicitarAulas<Persona>("/" + tipo, token(), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function actualizarPersona(
  tipo: TipoPersona,
  id: string,
  data: Partial<DatosPersona>,
) {
  return solicitarAulas<Persona>("/" + tipo + "/" + id, token(), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function eliminarPersona(tipo: TipoPersona, id: string) {
  return solicitarAulas<Persona>("/" + tipo + "/" + id, token(), {
    method: "DELETE",
  });
}

export function importarEstudiantesExcel(archivo: File) {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return solicitarAulas<ResultadoImportacion>("/estudiantes/importar/excel", token(), { method: "POST", body: formData });
}

export function importarDocentesExcel(archivo: File) {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return solicitarAulas<ResultadoImportacion>("/docentes/importar/excel", token(), { method: "POST", body: formData });
}
