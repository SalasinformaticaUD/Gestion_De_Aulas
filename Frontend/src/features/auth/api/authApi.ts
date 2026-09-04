import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

const token = () => {
  const value = obtenerSesion()?.tokenAcceso;
  if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return value;
};

export const verificarContrasenaParaEstadosTareas = (password: string) =>
  solicitarAulas<{ autorizado: boolean; expiraEn: number }>(
    "/auth/verificar-contrasena-tareas",
    token(),
    { method: "POST", body: JSON.stringify({ password }) },
  );
