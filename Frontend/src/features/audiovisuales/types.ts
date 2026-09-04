export type AudiovisualEquipmentStatus =
  | "DISPONIBLE"
  | "PRESTADO"
  | "MANTENIMIENTO"
  | "FUERA_DE_SERVICIO";

export type AudiovisualLoanStatus =
  | "SOLICITADO"
  | "APROBADO"
  | "ACTIVO"
  | "DEVUELTO"
  | "DEVUELTO_INCOMPLETO"
  | "CANCELADO"
  | "VENCIDO";

export type AudiovisualEquipment = {
  id: string;
  inventoryCode: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  status: AudiovisualEquipmentStatus;
  usageHours: number;
  loanCount: number;
  availableFrom?: string;
  observation?: string;
};

export type AudiovisualLoan = {
  id: string;
  teacher: string;
  room: string;
  checkoutAt: string;
  dueAt: string;
  returnedAt?: string;
  status: AudiovisualLoanStatus;
  equipmentIds: string[];
  deliveredBy: string;
  deliveredById?: string;
  responsibleType: "MONITOR" | "TECNICO" | "ASISTENCIAL";
  teacherDocument: string;
  extras: string[];
  receivedByType?: "MONITOR" | "TECNICO" | "ASISTENCIAL";
  returnObservations?: string;
  loanObservations?: string;
  receivedBy?: string;
  receivedById?: string;
  returnedAll?: boolean;
};

export type AudiovisualResponsible = {
  id: string;
  name: string;
  username: string;
  role?: string;
};

