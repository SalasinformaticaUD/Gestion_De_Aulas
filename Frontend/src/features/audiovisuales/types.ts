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
  | "CANCELADO"
  | "VENCIDO";

export type AudiovisualEquipment = {
  id: string;
  inventoryCode: string;
  name: string;
  type: string;
  status: AudiovisualEquipmentStatus;
  usageHours: number;
  loanCount: number;
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
};

