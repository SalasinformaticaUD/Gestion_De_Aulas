import type { ApplicationKey } from "@/features/auth/config/applications";
import type { UsuarioCentral } from "@/features/monitores/api/clienteMonitores";

const claveAlmacenamiento = "cosmos-session";
export const eventoSesion = "sgoas:session-changed";

export type SesionAplicacion = {
  aplicacion: ApplicationKey;
  tokenAcceso: string;
  expiraEn: number;
  usuario: UsuarioCentral;
  aplicacionesAutorizadas: ApplicationKey[];
};

export function guardarSesion(sesion: SesionAplicacion) {
  window.sessionStorage.setItem(claveAlmacenamiento, JSON.stringify(sesion));
  window.dispatchEvent(new Event(eventoSesion));
}

export function obtenerSesion(): SesionAplicacion | null {
  const guardada = window.sessionStorage.getItem(claveAlmacenamiento);
  if (!guardada) return null;
  try {
    const sesion = JSON.parse(guardada) as SesionAplicacion;
    if (!sesion.tokenAcceso || sesion.expiraEn <= Date.now()) {
      window.sessionStorage.removeItem(claveAlmacenamiento);
      return null;
    }
    if (sesion.aplicacion !== "aulas" && sesion.aplicacion !== "monitores") return null;
    // Compatibilidad con sesiones creadas antes de registrar los aplicativos.
    const aplicacionesAutorizadas = Array.isArray(sesion.aplicacionesAutorizadas)
      ? sesion.aplicacionesAutorizadas.filter((app): app is ApplicationKey => app === "aulas" || app === "monitores")
      : [sesion.aplicacion];
    return { ...sesion, aplicacionesAutorizadas };
  } catch {
    window.sessionStorage.removeItem(claveAlmacenamiento);
    return null;
  }
}

export function cerrarSesion() {
  window.sessionStorage.removeItem(claveAlmacenamiento);
  window.dispatchEvent(new Event(eventoSesion));
}

export function tieneAccesoAplicacion(
  aplicacion: ApplicationKey,
  sesion = obtenerSesion(),
) {
  return sesion?.aplicacionesAutorizadas.includes(aplicacion) ?? false;
}

export function cambiarAplicacionActiva(aplicacion: ApplicationKey) {
  const sesion = obtenerSesion();
  if (!sesion || !tieneAccesoAplicacion(aplicacion, sesion)) return false;
  guardarSesion({ ...sesion, aplicacion });
  return true;
}
