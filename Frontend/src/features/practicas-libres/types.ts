export type FreePracticeStatus = "ACTIVO" | "DEVUELTO" | "CANCELADO" | "VENCIDO";

export type PracticeStudent = {
  id: string;
  code: string;
  name: string;
  email?: string;
  activeFine: boolean;
};

export type FreePractice = {
  id: string;
  student: PracticeStudent;
  roomId: string;
  roomCode: string;
  start: string;
  estimatedEnd: string;
  actualEnd?: string;
  status: FreePracticeStatus;
};

