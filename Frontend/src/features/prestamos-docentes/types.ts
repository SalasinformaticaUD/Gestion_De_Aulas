export type TeacherLoanStatus =
  | "SOLICITADO"
  | "APROBADO"
  | "ACTIVO"
  | "DEVUELTO"
  | "CANCELADO"
  | "VENCIDO";

export type Teacher = {
  id: string;
  name: string;
  document: string;
  faculty: string;
};

export type TeacherLoan = {
  id: string;
  teacher: Teacher;
  roomId: string;
  roomCode: string;
  start: string;
  end: string;
  reason?: string;
  status: TeacherLoanStatus;
};
