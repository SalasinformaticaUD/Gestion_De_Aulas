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

export const cambiarContrasenaActual = (contrasenaActual: string, nuevaContrasena: string) =>
  solicitarAulas<{ actualizado: true }>(
    "/auth/cambiar-contrasena",
    token(),
    {
      method: "POST",
      body: JSON.stringify({ contrasenaActual, nuevaContrasena }),
      // Una clave actual errónea debe mostrarse en el formulario, no cerrar
      // la sesión como si el token fuese inválido.
      notificarAutorizacion: false,
    },
  );
