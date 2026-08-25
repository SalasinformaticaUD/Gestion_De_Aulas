import type { FreePractice, PracticeStudent } from "@/features/practicas-libres/types";

export const practiceStudents: PracticeStudent[] = [
  { id: "student-ana", code: "2022143021", name: "Ana Gómez López", email: "agomez@correo.udistrital.edu.co", activeFine: false },
  { id: "student-carlos", code: "2021098734", name: "Carlos Martínez", email: "cmartinez@correo.udistrital.edu.co", activeFine: false },
  { id: "student-valentina", code: "2023201456", name: "Valentina Ríos", email: "vrios@correo.udistrital.edu.co", activeFine: false },
  { id: "student-daniel", code: "2021102044", name: "Daniel Rodríguez", email: "drodriguez@correo.udistrital.edu.co", activeFine: true },
  { id: "student-laura", code: "2022201876", name: "Laura Sánchez", email: "lsanchez@correo.udistrital.edu.co", activeFine: false },
];

export const initialPractices: FreePractice[] = [
  { id: "PL-2026-0142", student: practiceStudents[0], roomId: "aula-402", roomCode: "402", start: "2026-08-25T06:50:00-05:00", estimatedEnd: "2026-08-25T09:00:00-05:00", status: "ACTIVO" },
  { id: "PL-2026-0143", student: practiceStudents[1], roomId: "aula-503", roomCode: "503", start: "2026-08-25T06:55:00-05:00", estimatedEnd: "2026-08-25T08:00:00-05:00", status: "VENCIDO" },
  { id: "PL-2026-0144", student: practiceStudents[2], roomId: "aula-405", roomCode: "405", start: "2026-08-25T08:00:00-05:00", estimatedEnd: "2026-08-25T10:00:00-05:00", status: "ACTIVO" },
  { id: "PL-2026-0140", student: practiceStudents[4], roomId: "aula-602", roomCode: "602", start: "2026-08-24T14:00:00-05:00", estimatedEnd: "2026-08-24T16:00:00-05:00", actualEnd: "2026-08-24T15:48:00-05:00", status: "DEVUELTO" },
  { id: "PL-2026-0139", student: practiceStudents[0], roomId: "aula-504", roomCode: "504", start: "2026-08-23T10:00:00-05:00", estimatedEnd: "2026-08-23T12:00:00-05:00", actualEnd: "2026-08-23T10:17:00-05:00", status: "CANCELADO" },
];

