import type { CleaningRecord } from "@/features/limpieza/types";

export const initialCleaningRecords: CleaningRecord[] = [
  { id: "60000000-0000-4000-8000-000000000001", folio: "LIM-2026-0328", roomId: "aula-401", roomCode: "401", performedAt: "2026-08-25T06:22:00-05:00", observation: "Limpieza general realizada. Se dejó reporte por marcador permanente en el tablero lateral." },
  { id: "60000000-0000-4000-8000-000000000002", folio: "LIM-2026-0327", roomId: "aula-402", roomCode: "402", performedAt: "2026-08-25T06:38:00-05:00" },
  { id: "60000000-0000-4000-8000-000000000003", folio: "LIM-2026-0326", roomId: "aula-403", roomCode: "403", performedAt: "2026-08-25T07:05:00-05:00", observation: "Se encontraron dos sillas fuera de ubicación; fueron organizadas antes de la apertura." },
  { id: "60000000-0000-4000-8000-000000000004", folio: "LIM-2026-0325", roomId: "aula-501", roomCode: "501", performedAt: "2026-08-25T07:24:00-05:00" },
  { id: "60000000-0000-4000-8000-000000000005", folio: "LIM-2026-0324", roomId: "aula-404", roomCode: "404", performedAt: "2026-08-24T18:12:00-05:00", observation: "Se requiere reposición de jabón en el dispensador cercano al aula." },
  { id: "60000000-0000-4000-8000-000000000006", folio: "LIM-2026-0323", roomId: "aula-405", roomCode: "405", performedAt: "2026-08-24T18:35:00-05:00" },
  { id: "60000000-0000-4000-8000-000000000007", folio: "LIM-2026-0322", roomId: "aula-502", roomCode: "502", performedAt: "2026-08-24T19:02:00-05:00", observation: "Limpieza completada sin novedades." },
  { id: "60000000-0000-4000-8000-000000000008", folio: "LIM-2026-0321", roomId: "aula-503", roomCode: "503", performedAt: "2026-08-23T07:10:00-05:00" },
  { id: "60000000-0000-4000-8000-000000000009", folio: "LIM-2026-0320", roomId: "aula-601", roomCode: "601", performedAt: "2026-08-22T06:48:00-05:00", observation: "Se retiraron residuos de papel acumulados junto al punto de impresión." },
];
