import { obtenerSesion } from "@/features/auth/lib/sesion";
import { descargarAulas, solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type {
  CatalogosNormalizacion,
  FiltrosSolicitudes,
  ItemSolicitud,
  PrevisualizacionImportacion,
  PrevisualizacionAprobacion,
  SeleccionAprobacion,
  SolicitudInstalacion,
} from "../types";

type Pagina<T> = { data: T[]; meta: { pagina: number; limite: number; total: number; totalPaginas: number } };

function token() {
  const valor = obtenerSesion()?.tokenAcceso;
  if (!valor) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return valor;
}

export function listarSolicitudes(filtros: FiltrosSolicitudes) {
  const parametros = parametrosFiltros(filtros);
  parametros.set("limite", "20");
  return solicitarAulas<Pagina<SolicitudInstalacion>>(`/solicitudes-instalacion?${parametros}`, token());
}

export const obtenerSolicitud = (id: string) =>
  solicitarAulas<SolicitudInstalacion>(`/solicitudes-instalacion/${id}`, token());

export const cargarCatalogosNormalizacion = () =>
  solicitarAulas<CatalogosNormalizacion>("/solicitudes-instalacion/catalogos/normalizacion", token());

export async function previsualizarSolicitudes(archivo: File) {
  const formulario = new FormData();
  formulario.append("archivo", archivo);
  return solicitarAulas<PrevisualizacionImportacion>("/solicitudes-instalacion/importaciones/previsualizar", token(), {
    method: "POST",
    body: formulario,
  });
}

export async function importarSolicitudes(archivo: File) {
  const formulario = new FormData();
  formulario.append("archivo", archivo);
  return solicitarAulas<{ importacion: { id: string; nombreArchivo: string }; resumen: { totalFilas: number; solicitudesCreadas: number; filasObservadas: number; filasRechazadas: number } }>(
    "/solicitudes-instalacion/importaciones",
    token(),
    { method: "POST", body: formulario },
  );
}

export const actualizarSolicitud = (
  id: string,
  datos: { docenteId?: string | null; periodoId?: string | null },
) => solicitarAulas(`/solicitudes-instalacion/${id}`, token(), { method: "PATCH", body: JSON.stringify(datos) });

export const actualizarItemSolicitud = (
  solicitudId: string,
  itemId: string,
  datos: {
    estadoRevision?: ItemSolicitud["estadoRevision"];
    aulas?: Array<{ id: string; aulaId: string | null; estado: "COINCIDENCIA" | "NUEVO"; guardarAlias: boolean }>;
  },
) => solicitarAulas<SolicitudInstalacion>(`/solicitudes-instalacion/${solicitudId}/items/${itemId}`, token(), {
  method: "PATCH",
  body: JSON.stringify(datos),
});

export const previsualizarAprobacion = (id: string, seleccion: SeleccionAprobacion) =>
  solicitarAulas<PrevisualizacionAprobacion>(`/solicitudes-instalacion/${id}/previsualizar-aprobacion`, token(), {
    method: "POST",
    body: JSON.stringify(seleccion),
  });

export const aprobarSolicitud = (id: string, seleccion: SeleccionAprobacion) =>
  solicitarAulas<{ aprobacion: "TOTAL" | "PARCIAL"; creadas: unknown[]; existentes: unknown[] }>(
    `/solicitudes-instalacion/${id}/aprobar`,
    token(),
    { method: "POST", body: JSON.stringify(seleccion) },
  );

export const rechazarSolicitud = (id: string, motivo: string) =>
  solicitarAulas(`/solicitudes-instalacion/${id}/rechazar`, token(), {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });

export const confirmarInstalacionInventario = (solicitudId: string, tareaId: string) =>
  solicitarAulas(`/solicitudes-instalacion/${solicitudId}/tareas/${tareaId}/confirmar-instalacion`, token(), {
    method: "POST",
  });

export const descargarSolicitudesFiltradas = (filtros: FiltrosSolicitudes) =>
  descargarAulas(`/solicitudes-instalacion/exportar?${parametrosFiltros(filtros)}`, token());

export const descargarResultadoImportacion = (id: string) =>
  descargarAulas(`/solicitudes-instalacion/importaciones/${id}/resultado.csv`, token());

function parametrosFiltros(filtros: FiltrosSolicitudes) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  });
  return parametros;
}
