const baseMonitores = "/api/monitores";
const baseAulas = "/api/aulas";

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

async function interpretarRespuesta<T>(respuesta: Response): Promise<T> {
  if (respuesta.status === 204) return undefined as T;
  const tipo = respuesta.headers.get("content-type") ?? "";
  const cuerpo = tipo.includes("application/json")
    ? await respuesta.json()
    : await respuesta.text();
  if (!respuesta.ok) {
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
  return interpretarRespuesta<T>(respuesta);
}

export async function solicitarMonitores<T>(ruta: string, opciones: RequestInit = {}) {
  const metodo = (opciones.method ?? "GET").toUpperCase();
  const cabeceras = new Headers(opciones.headers);
  if (!(opciones.body instanceof FormData) && opciones.body) cabeceras.set("Content-Type", "application/json");
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
  return interpretarRespuesta<T>(respuesta);
}

export async function prepararCsrfMonitores() {
  await fetch(`${baseMonitores}/login/`, { credentials: "include", signal: AbortSignal.timeout(4000) });
}

export async function iniciarSesionMonitores(username: string, password: string) {
  await prepararCsrfMonitores();
  return solicitarMonitores<UsuarioMonitoresApi>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
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

export type UsuarioMonitoresApi = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "leader";
  department: string;
};
