import type { ApplicationKey } from "@/features/auth/config/applications";
import type { UsuarioCentral, UsuarioMonitoresApi } from "@/features/monitores/api/clienteMonitores";

const claveAlmacenamiento = "cosmos-session";

export type SesionAplicacion = {
  aplicacion: ApplicationKey;
  tokenAcceso: string;
  expiraEn: number;
  usuario: UsuarioCentral;
  usuarioMonitores?: UsuarioMonitoresApi;
  modoDemo?: boolean;
};

export function guardarSesion(sesion: SesionAplicacion) {
  window.sessionStorage.setItem(claveAlmacenamiento, JSON.stringify(sesion));
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
    return sesion.aplicacion === "aulas" || sesion.aplicacion === "monitores" ? sesion : null;
  } catch {
    window.sessionStorage.removeItem(claveAlmacenamiento);
    return null;
  }
}

export function cerrarSesion() {
  window.sessionStorage.removeItem(claveAlmacenamiento);
}
