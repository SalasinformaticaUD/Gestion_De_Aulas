export type TaskStatus = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";

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
  start?: string;
  end?: string;
};
