export type AvailabilityState =
  | "disponible"
  | "ocupada"
  | "reservada"
  | "mantenimiento"
  | "bloqueada";

export type AvailabilitySourceType =
  | "estado-aula"
  | "restriccion"
  | "clase-programada"
  | "prestamo-docente"
  | "practica-libre"
  | "tarea-operativa";

export type AvailabilitySource = {
  type: AvailabilitySourceType;
  id: string;
  description: string;
  status?: string;
};

export type NextActivity = AvailabilitySource & {
  startTime: string;
  endTime: string | null;
};

export type AvailabilityRoom = {
  id: string;
  code: string;
  location: string;
  floor: number;
  capacity: number;
  physicalStatus: "OPERATIVA" | "MANTENIMIENTO" | "FUERA_DE_SERVICIO";
  software: Array<{ id: string; name: string }>;
  characteristics: string[];
};

export type AvailabilityResult = {
  room: AvailabilityRoom;
  block: {
    date: string;
    startTime: string;
    endTime: string;
    durationHours: 2;
  };
  calculatedState: AvailabilityState;
  reason: string;
  currentBlock: AvailabilitySource | null;
  nextActivity: NextActivity | null;
  sources: AvailabilitySource[];
  calculatedAt: string;
  persisted: false;
};

export type AvailabilityHistoryEvent = {
  type: AvailabilitySourceType;
  id: string;
  start: string;
  end: string | null;
  description: string;
  status?: string;
};

