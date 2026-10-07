import { obtenerSesion } from "@/features/auth/lib/sesion";

const baseMonitores = "/api/monitores";
const baseAulas = "/api/aulas";
const tiempoEsperaConsultaMs = 30_000;
const tiempoEsperaDescargaMs = 180_000;
const estadosTransitorios = new Set([502, 503, 504]);
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

const esperar = (milisegundos: number) => new Promise((resolve) => window.setTimeout(resolve, milisegundos));

function errorDeConexion(error: unknown, tiempoEspera: number) {
  const nombre = error instanceof Error ? error.name : "";
  if (nombre === "TimeoutError" || nombre === "AbortError") {
    return new ErrorApi(
      `La consulta tardó más de ${Math.round(tiempoEspera / 1000)} segundos. Intente nuevamente.`,
      0,
      error,
    );
  }
  return new ErrorApi(
    "No fue posible conectar con el servidor. La aplicación volverá a intentarlo automáticamente cuando sea una consulta.",
    0,
    error,
  );
}

async function solicitarConRecuperacion(
  url: string,
  opciones: RequestInit,
  tiempoEspera = tiempoEsperaConsultaMs,
) {
  const metodo = (opciones.method ?? "GET").toUpperCase();
  const consultaSegura = ["GET", "HEAD", "OPTIONS"].includes(metodo);
  // Las escrituras nunca se reintentan: si la respuesta se pierde, repetirlas
  // podría crear o modificar el mismo registro dos veces.
  const intentos = consultaSegura && !opciones.signal ? 3 : 1;

  for (let intento = 0; intento < intentos; intento += 1) {
    try {
      const respuesta = await fetch(url, {
        ...opciones,
        signal: opciones.signal ?? AbortSignal.timeout(tiempoEspera),
      });
      if (estadosTransitorios.has(respuesta.status) && intento + 1 < intentos) {
        await esperar(400 * (intento + 1));
        continue;
      }
      return respuesta;
    } catch (error) {
      if (intento + 1 >= intentos || opciones.signal) throw errorDeConexion(error, tiempoEspera);
      await esperar(400 * (intento + 1));
    }
  }

  throw new ErrorApi("No fue posible conectar con el servidor.", 0);
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
        "El servidor devolvió una página HTML inesperada. Verifica que API Monitores esté iniciada y revisa el detalle de la operación.",
        respuesta.status,
      );
    }
    const datos = typeof cuerpo === "object" && cuerpo !== null ? cuerpo as Record<string, unknown> : null;
    const primerDetalle = datos && Object.values(datos).flatMap((valor) => Array.isArray(valor) ? valor : [valor]).find((valor) => typeof valor === "string");
    const mensaje =
      datos
        ? String(datos.detail ?? datos.message ?? primerDetalle ?? "La operación no pudo completarse.")
        : String(cuerpo || "La operación no pudo completarse.");
    throw new ErrorApi(mensaje, respuesta.status, cuerpo);
  }
  return cuerpo as T;
}

type OpcionesSolicitudAulas = RequestInit & { notificarAutorizacion?: boolean };

export async function solicitarAulas<T>(ruta: string, token?: string, opciones: OpcionesSolicitudAulas = {}) {
  const cabeceras = new Headers(opciones.headers);
  if (!(opciones.body instanceof FormData)) cabeceras.set("Content-Type", "application/json");
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  const respuesta = await solicitarConRecuperacion(`${baseAulas}${ruta}`, { ...opciones, headers: cabeceras });
  return interpretarRespuesta<T>(respuesta, Boolean(token) && opciones.notificarAutorizacion !== false);
}

/** Descarga un archivo binario desde la API de Aulas conservando la sesión actual. */
export async function descargarAulas(ruta: string, token?: string, opciones: RequestInit = {}) {
  const cabeceras = new Headers(opciones.headers);
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  const respuesta = await solicitarConRecuperacion(
    `${baseAulas}${ruta}`,
    { ...opciones, headers: cabeceras, signal: opciones.signal ?? AbortSignal.timeout(tiempoEsperaDescargaMs) },
    tiempoEsperaDescargaMs,
  );
  if (!respuesta.ok) {
    notificarErrorAutorizacion(respuesta.status);
    const tipo = respuesta.headers.get("content-type") ?? "";
    const cuerpo = tipo.includes("application/json") ? await respuesta.json().catch(() => null) : await respuesta.text().catch(() => "");
    const mensaje = typeof cuerpo === "object" && cuerpo !== null
      ? String((cuerpo as { message?: unknown; detail?: unknown }).message ?? (cuerpo as { detail?: unknown }).detail ?? "No fue posible generar el PDF.")
      : String(cuerpo || "No fue posible generar el PDF.");
    throw new ErrorApi(mensaje, respuesta.status, cuerpo);
  }
  return respuesta.blob();
}

type OpcionesSolicitudMonitores = RequestInit & { notificarAutorizacion?: boolean };

export async function solicitarMonitores<T>(
  ruta: string,
  { notificarAutorizacion = true, ...opciones }: OpcionesSolicitudMonitores = {},
) {
  const metodo = (opciones.method ?? "GET").toUpperCase();
  const cabeceras = new Headers(opciones.headers);
  if (!(opciones.body instanceof FormData) && opciones.body) cabeceras.set("Content-Type", "application/json");
  const token = obtenerSesion()?.tokenAcceso;
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  if (!["GET", "HEAD", "OPTIONS"].includes(metodo)) {
    const csrf = decodeURIComponent(leerCookie("monitores_csrftoken"));
    if (csrf) cabeceras.set("X-CSRFToken", csrf);
  }
  const respuesta = await solicitarConRecuperacion(`${baseMonitores}${ruta}`, {
    ...opciones,
    // Los estados de aprobación y los horarios históricos deben reflejar la
    // respuesta vigente de la API, no una copia almacenada por el navegador.
    cache: opciones.cache ?? "no-store",
    // La identidad se transmite por Authorization; una cookie de otra pestaña no debe participar.
    credentials: "omit",
    headers: cabeceras,
  });
  return interpretarRespuesta<T>(respuesta, Boolean(token) && notificarAutorizacion);
}

export async function descargarMonitores(ruta: string, opciones: RequestInit = {}) {
  const cabeceras = new Headers(opciones.headers);
  const token = obtenerSesion()?.tokenAcceso;
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  const respuesta = await solicitarConRecuperacion(
    `${baseMonitores}${ruta}`,
    { ...opciones, credentials: "omit", headers: cabeceras, signal: opciones.signal ?? AbortSignal.timeout(tiempoEsperaDescargaMs) },
    tiempoEsperaDescargaMs,
  );
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
  fotoPerfil: string | null;
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

export type RespuestaLoginMonitores = {
  access_token: string;
  expires_in: number;
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  monitor_is_current: boolean | null;
};
