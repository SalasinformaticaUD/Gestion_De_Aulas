export type RoomStatus = "disponible" | "en-clase" | "reservada" | "mantenimiento";

export type Workstation = {
  number: number;
  status: "operativo" | "mantenimiento" | "fuera-de-servicio";
};

export type RoomSoftware = {
  name: string;
  version: string;
  licenses: number;
  status: "activo" | "inactivo";
};

export type RoomHistoryEntry = {
  timestamp: string;
  action: string;
  responsible: string;
};

export type Room = {
  id: string;
  code: string;
  floor: number;
  capacity: number;
  status: RoomStatus;
  software: RoomSoftware[];
  workstations: Workstation[];
  location: string;
  hardware: string;
  curriculumProject: string;
  acquisitionYear: number;
  history: RoomHistoryEntry[];
  notes?: string;
};
