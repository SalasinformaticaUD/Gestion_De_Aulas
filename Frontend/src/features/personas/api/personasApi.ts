import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

const TIEMPO_ESPERA_IMPORTACION_ESTUDIANTES_MS = 30 * 60 * 1000;

export type Persona = {
  id: string;
  codigo?: string;
  documento?: string | null;
  nombre: string;
  correo?: string | null;
  proyecto?: string | null;
  proyectoCurricular?: string | null;
};

type TipoPersona = "estudiantes" | "docentes";
type DatosPersona = { codigo?: string; documento?: string; nombre: string; correo?: string; proyecto?: string };
type ResultadoImportacion = { total: number; procesados?: number; omitidasDuplicadas?: number; creados: number; actualizados: number; eliminados: number; conservadosPorHistorial: number };
export type Pagina<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };
export type ResultadoBusquedaMasivaEstudiantes = {
  totalFilas: number;
  procesados: number;
  duplicados: number;
  activos: number;
  inactivos: number;
  resultados: Array<{
    codigo: string | null;
    nombre: string | null;
    correo: string;
    proyectoCurricular: string | null;
    estado: "ACTIVO" | "INACTIVO";
  }>;
};

function token() {
  const value = obtenerSesion()?.tokenAcceso;
  if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return value;
}

export function listarPersonas(tipo: TipoPersona, query = "") {
  const suffix = query ? "?q=" + encodeURIComponent(query) : "";
  return solicitarAulas<Persona[]>("/" + tipo + suffix, token());
}

export function listarPersonasPaginadas(tipo: TipoPersona, page: number, query = "") {
  const params = new URLSearchParams({ page: String(page), limit: "25" });
  if (query.trim()) params.set("q", query.trim());
  return solicitarAulas<Pagina<Persona>>("/" + tipo + "?" + params.toString(), token());
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
  return solicitarAulas<ResultadoImportacion>("/estudiantes/importar/excel", token(), {
    method: "POST",
    body: formData,
    tiempoEsperaMs: TIEMPO_ESPERA_IMPORTACION_ESTUDIANTES_MS,
  });
}

export function importarDocentesExcel(archivo: File) {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return solicitarAulas<ResultadoImportacion>("/docentes/importar/excel", token(), { method: "POST", body: formData });
}

export function buscarEstudiantesMasivo(archivo: File) {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return solicitarAulas<ResultadoBusquedaMasivaEstudiantes>("/estudiantes/busqueda-masiva", token(), { method: "POST", body: formData });
}
