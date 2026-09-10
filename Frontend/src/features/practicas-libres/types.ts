export type FreePracticeStatus = "ACTIVO" | "DEVUELTO" | "CANCELADO" | "VENCIDO";

export type PracticeStudent = {
  id: string;
  code: string;
  name: string;
  email?: string;
  activeFine: boolean;
};

export type PracticeResponsible = {
  id: string;
  name: string;
  username: string;
  role?: string;
};

export type FreePractice = {
  id: string;
  requesterType: "ESTUDIANTE" | "DOCENTE";
  student: PracticeStudent;
  roomId: string;
  roomCode: string;
  start: string;
  estimatedEnd: string;
  actualEnd?: string;
  status: FreePracticeStatus;
  responsibleType: "MONITOR" | "TECNICO" | "ASISTENCIAL";
  attendedBy?: string;
  requestedSoftware: string;
};

