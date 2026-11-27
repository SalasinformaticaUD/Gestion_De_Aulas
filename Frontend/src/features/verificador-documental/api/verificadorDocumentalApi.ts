import { obtenerSesion } from "@/features/auth/lib/sesion";
import {
  eventoErrorAutorizacion,
  solicitarAulas,
} from "@/features/monitores/api/clienteMonitores";
import type {
  CatalogosDocumentales,
  DetalleVerificacion,
  NuevaVerificacion,
  PaginaVerificaciones,
  Verificacion,
} from "../types";

const base = "/verificador-documental";
function token() {
  const valor = obtenerSesion()?.tokenAcceso;
  if (!valor) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return valor;
}
export const cargarCatalogos = () =>
  solicitarAulas<CatalogosDocumentales>(`${base}/catalogos`, token());
export const crearVerificacion = (datos: NuevaVerificacion) =>
  solicitarAulas<Verificacion>(`${base}/verificaciones`, token(), {
    method: "POST",
    body: JSON.stringify(datos),
  });
export const listarVerificaciones = (pagina: number, q: string) =>
  solicitarAulas<PaginaVerificaciones>(
    `${base}/verificaciones?${new URLSearchParams({ pagina: String(pagina), limite: "20", q })}`,
    token(),
  );
export const obtenerVerificacion = (id: string) =>
  solicitarAulas<DetalleVerificacion>(
    `${base}/verificaciones/${encodeURIComponent(id)}`,
    token(),
  );
export const eliminarVerificacion = (id: string) =>
  solicitarAulas<{ id: string; eliminado: boolean }>(
    `${base}/verificaciones/${encodeURIComponent(id)}`,
    token(),
    { method: "DELETE" },
  );

// XHR permite mostrar los bytes realmente enviados; la consulta JSON sigue
// usando el cliente compartido de Aulas. No se reintentan escrituras automáticamente.
export function cargarYProcesarArchivos(
  id: string,
  archivos: File[],
  progreso: (porcentaje: number) => void,
  procesando: () => void,
): Promise<DetalleVerificacion> {
  const acceso = token();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/aulas${base}/verificaciones/${encodeURIComponent(id)}/procesar`,
    );
    xhr.setRequestHeader("Authorization", `Bearer ${acceso}`);
    xhr.timeout = 180000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progreso(Math.round((event.loaded * 100) / event.total));
    };
    xhr.upload.onload = () => {
      progreso(100);
      procesando();
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "No fue posible conectar. Sus archivos siguen seleccionados; revise el historial antes de reintentar.",
        ),
      );
    xhr.ontimeout = () =>
      reject(
        new Error(
          "Se agotó el tiempo de espera. Actualice el historial para comprobar si el servidor recibió los archivos antes de reintentar.",
        ),
      );
    xhr.onload = () => {
      let cuerpo: Record<string, unknown>;
      try {
        cuerpo = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        reject(
          new Error(
            "El servidor devolvió una respuesta inesperada. Revise el historial antes de reintentar.",
          ),
        );
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300)
        resolve(cuerpo as DetalleVerificacion);
      else {
        if (xhr.status === 401 || xhr.status === 403)
          window.dispatchEvent(
            new CustomEvent(eventoErrorAutorizacion, {
              detail: { estado: xhr.status },
            }),
          );
        const mensaje = Array.isArray(cuerpo.message)
          ? cuerpo.message.join(" ")
          : cuerpo.message;
        reject(
          new Error(
            typeof mensaje === "string"
              ? mensaje
              : "No fue posible cargar los PDF.",
          ),
        );
      }
    };
    const formulario = new FormData();
    archivos.forEach((archivo) => formulario.append("archivos", archivo));
    xhr.send(formulario);
  });
}
