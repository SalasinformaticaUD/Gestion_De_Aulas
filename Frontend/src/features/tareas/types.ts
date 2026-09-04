export type TaskStatus = "PENDIENTE" | "EN_PROCESO" | "SUSPENDIDA" | "COMPLETADA" | "RECHAZADA" | "CANCELADA";

export type TaskUser = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export type OperationalTask = {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: TaskStatus;
  roomId?: string;
  roomCode?: string;
  responsibleId?: string;
  affectsAvailability: boolean;
  createdAt?: string;
  completedAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  creatorId?: string;
  creator?: { id: string; nombreCompleto: string };
  canceledById?: string;
  canceledBy?: { id: string; nombreCompleto: string };
  statusBeforeCancellation?: TaskStatus;
  start?: string;
  end?: string;
  type?: string;
  priority?: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
  observations?: string;
  decisions?: Array<{ id: string; decision: "ACEPTADA" | "RECHAZADA"; tomadaEn: string; participantes?: Array<{ id: string; nombreCompleto: string }>; usuario: { nombreCompleto: string } }>;
  responsibles?: Array<{ id: string; usuarioId: string; agregadoEn: string; usuario: { id: string; nombreCompleto: string } }>;
  reports?: Array<{ id: string; actividadesRealizadas: string; accionesPendientes?: string | null; responsables?: Array<{ id: string; nombreCompleto: string }>; creadoEn: string; autor: { id: string; nombreCompleto: string } }>;
};
