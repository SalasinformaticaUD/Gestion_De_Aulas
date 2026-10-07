import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type UsuarioDistribucionPdf = {
  id: string;
  nombreCompleto: string;
  nombreUsuario: string;
  cargo: string | null;
};

export type ConfiguracionDistribucionPdf = {
  activa: boolean;
  usuarioIds: string[];
  usuariosDisponibles: UsuarioDistribucionPdf[];
};

const token = () => {
  const valor = obtenerSesion()?.tokenAcceso;
  if (!valor) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return valor;
};

export const obtenerConfiguracionDistribucionPdf = () =>
  solicitarAulas<ConfiguracionDistribucionPdf>(
    "/configuracion-distribucion-pdf",
    token(),
  );

export const guardarConfiguracionDistribucionPdf = (
  activa: boolean,
  usuarioIds: string[],
) =>
  solicitarAulas<ConfiguracionDistribucionPdf>(
    "/configuracion-distribucion-pdf",
    token(),
    {
      method: "PATCH",
      body: JSON.stringify({ activa, usuarioIds }),
    },
  );
