export type EstadoCuentaMonitor = "ACTIVO" | "PENDIENTE" | "INACTIVO";

export type CuentaMonitor = {
  id: string;
  nombre: string;
  codigo: string;
  documento: string;
  correo: string;
  proyecto: string;
  telefono: string;
  dependencia: string;
  repite: boolean;
  alertas: number;
  estado: EstadoCuentaMonitor;
};

export type FormularioCuentaMonitor = Pick<CuentaMonitor, "nombre" | "codigo" | "documento" | "correo" | "proyecto" | "telefono" | "dependencia" | "repite">;
