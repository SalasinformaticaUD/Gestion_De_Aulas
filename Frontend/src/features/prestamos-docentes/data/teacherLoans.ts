import type { Teacher, TeacherLoan } from "@/features/prestamos-docentes/types";

export const teachers: Teacher[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Laura Vargas", document: "52110432", faculty: "Ingeniería" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Andrés Pérez", document: "80195421", faculty: "Ingeniería" },
  { id: "33333333-3333-4333-8333-333333333333", name: "María Torres", document: "51770318", faculty: "Ciencias y Educación" },
  { id: "44444444-4444-4444-8444-444444444444", name: "Felipe Gómez", document: "79320514", faculty: "Ingeniería" },
  { id: "55555555-5555-4555-8555-555555555555", name: "Diana López", document: "52740981", faculty: "Tecnológica" },
];

export const initialTeacherLoans: TeacherLoan[] = [
  { id: "PD-2026-0128", teacher: teachers[1], roomId: "aula-402", roomCode: "402", start: "2026-08-25T12:00:00-05:00", end: "2026-08-25T14:00:00-05:00", reason: "Semillero de algoritmos y estructuras de datos", status: "SOLICITADO" },
  { id: "PD-2026-0127", teacher: teachers[2], roomId: "aula-403", roomCode: "403", start: "2026-08-25T08:00:00-05:00", end: "2026-08-25T10:00:00-05:00", reason: "Taller de estadística aplicada", status: "APROBADO" },
  { id: "PD-2026-0126", teacher: teachers[4], roomId: "aula-504", roomCode: "504", start: "2026-08-25T10:00:00-05:00", end: "2026-08-25T12:00:00-05:00", reason: "Sesión complementaria de Programación II", status: "ACTIVO" },
  { id: "PD-2026-0125", teacher: teachers[0], roomId: "aula-602", roomCode: "602", start: "2026-08-24T14:00:00-05:00", end: "2026-08-24T16:00:00-05:00", reason: "Sustentaciones de proyecto de grado", status: "DEVUELTO" },
  { id: "PD-2026-0124", teacher: teachers[3], roomId: "aula-701", roomCode: "701", start: "2026-08-23T18:00:00-05:00", end: "2026-08-23T20:00:00-05:00", reason: "Clase de reposición", status: "CANCELADO" },
  { id: "PD-2026-0123", teacher: teachers[1], roomId: "aula-501", roomCode: "501", start: "2026-08-22T08:00:00-05:00", end: "2026-08-22T10:00:00-05:00", reason: "Laboratorio de bases de datos", status: "VENCIDO" },
];
