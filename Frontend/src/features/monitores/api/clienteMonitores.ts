import { obtenerSesion } from "@/features/auth/lib/sesion";

const baseMonitores = "/api/monitores";
const baseAulas = "/api/aulas";
export const eventoErrorAutorizacion = "sgoas:authorization-error";

export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly estado: number,
    public readonly detalles?: unknown,
  ) {
    super(message);
  }
}

function leerCookie(nombre: string) {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${nombre}=`))
    ?.split("=")
    .slice(1)
    .join("=") ?? "";
}

function notificarErrorAutorizacion(estado: number) {
  if (typeof window === "undefined" || (estado !== 401 && estado !== 403)) return;
  window.dispatchEvent(new CustomEvent(eventoErrorAutorizacion, { detail: { estado } }));
}

async function interpretarRespuesta<T>(respuesta: Response, notificarAutorizacion = false): Promise<T> {
  if (respuesta.status === 204) return undefined as T;
  const tipo = respuesta.headers.get("content-type") ?? "";
  const cuerpo = tipo.includes("application/json")
    ? await respuesta.json()
    : await respuesta.text();
  if (!respuesta.ok) {
    if (notificarAutorizacion) notificarErrorAutorizacion(respuesta.status);
    if (typeof cuerpo === "string" && cuerpo.trimStart().startsWith("<")) {
      throw new ErrorApi(
        "El servidor devolvió una página HTML en lugar de la respuesta de autenticación. Reinicie el frontend para aplicar el proxy /api/aulas.",
        respuesta.status,
      );
    }
    const mensaje =
      typeof cuerpo === "object" && cuerpo !== null
        ? String((cuerpo as { detail?: unknown; message?: unknown }).detail ?? (cuerpo as { message?: unknown }).message ?? "La operación no pudo completarse.")
        : String(cuerpo || "La operación no pudo completarse.");
    throw new ErrorApi(mensaje, respuesta.status, cuerpo);
  }
  return cuerpo as T;
}

export async function solicitarAulas<T>(ruta: string, token?: string, opciones: RequestInit = {}) {
  const cabeceras = new Headers(opciones.headers);
  if (!(opciones.body instanceof FormData)) cabeceras.set("Content-Type", "application/json");
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  const respuesta = await fetch(`${baseAulas}${ruta}`, { ...opciones, headers: cabeceras });
  return interpretarRespuesta<T>(respuesta, Boolean(token));
}

export async function solicitarMonitores<T>(ruta: string, opciones: RequestInit = {}) {
  const metodo = (opciones.method ?? "GET").toUpperCase();
  const cabeceras = new Headers(opciones.headers);
  if (!(opciones.body instanceof FormData) && opciones.body) cabeceras.set("Content-Type", "application/json");
  const token = obtenerSesion()?.tokenAcceso;
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  if (!["GET", "HEAD", "OPTIONS"].includes(metodo)) {
    const csrf = decodeURIComponent(leerCookie("csrftoken"));
    if (csrf) cabeceras.set("X-CSRFToken", csrf);
  }
  const respuesta = await fetch(`${baseMonitores}${ruta}`, {
    ...opciones,
    signal: opciones.signal ?? AbortSignal.timeout(8000),
    credentials: "include",
    headers: cabeceras,
  });
  return interpretarRespuesta<T>(respuesta, Boolean(token));
}

export async function descargarMonitores(ruta: string, opciones: RequestInit = {}) {
  const cabeceras = new Headers(opciones.headers);
  const token = obtenerSesion()?.tokenAcceso;
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  const respuesta = await fetch(`${baseMonitores}${ruta}`, { ...opciones, headers: cabeceras });
  if (!respuesta.ok) {
    notificarErrorAutorizacion(respuesta.status);
    throw new ErrorApi("No fue posible descargar el documento.", respuesta.status);
  }
  return respuesta.blob();
}

export type UsuarioCentral = {
  id: string;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  cargo: string | null;
  dependencia: { id: string; nombre: string } | null;
  roles: string[];
  permisos: string[];
  modulos: string[];
};

export type RespuestaLoginCentral = {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  usuario: UsuarioCentral;
  aplicaciones: {
    puedeAccederAulas: boolean;
    puedeAccederMonitores: boolean;
    urlMonitores: string | null;
  };
};
