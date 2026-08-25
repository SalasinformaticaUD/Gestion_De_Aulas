import type { FineReason, FineRecord, FineStudent } from "@/features/multas/types";

export const fineStudents: FineStudent[] = [
  { id: "e0000000-0000-4000-8000-000000000001", code: "2022143021", name: "Ana Gómez López" },
  { id: "e0000000-0000-4000-8000-000000000002", code: "2021098734", name: "Carlos Martínez" },
  { id: "e0000000-0000-4000-8000-000000000003", code: "2023201456", name: "Valentina Ríos" },
  { id: "e0000000-0000-4000-8000-000000000004", code: "2021102044", name: "Daniel Rodríguez" },
  { id: "e0000000-0000-4000-8000-000000000005", code: "2022201876", name: "Laura Sánchez" },
  { id: "e0000000-0000-4000-8000-000000000006", code: "2023102098", name: "Mateo Hernández" },
];

export const initialFineReasons: FineReason[] = [
  { id: "f0000000-0000-4000-8000-000000000001", name: "Daño de elemento", description: "Deterioro o daño comprobado de equipos, periféricos o mobiliario." },
  { id: "f0000000-0000-4000-8000-000000000002", name: "Entrega tardía", description: "Incumplimiento del horario de devolución asignado." },
  { id: "f0000000-0000-4000-8000-000000000003", name: "Pérdida de elemento", description: "Elemento entregado que no fue devuelto al finalizar el servicio." },
  { id: "f0000000-0000-4000-8000-000000000004", name: "Uso no autorizado", description: "Uso de equipos, software o espacios fuera de las condiciones permitidas." },
];

export const initialFines: FineRecord[] = [
  { id: "11000000-0000-4000-8000-000000000001", folio: "MUL-2026-0098", student: fineStudents[3], reasonId: initialFineReasons[0].id, description: "Se reportó daño en el conector USB del teclado asignado durante la práctica libre.", status: "ACTIVA", date: "2026-08-24T16:42:00-05:00", imposedBy: "Ivan Prado" },
  { id: "11000000-0000-4000-8000-000000000002", folio: "MUL-2026-0097", student: fineStudents[5], reasonId: initialFineReasons[2].id, description: "No se devolvió el adaptador HDMI entregado para uso en el Aula 503.", status: "ACTIVA", date: "2026-08-23T18:15:00-05:00", imposedBy: "Jhon Rodríguez" },
  { id: "11000000-0000-4000-8000-000000000003", folio: "MUL-2026-0096", student: fineStudents[0], reasonId: initialFineReasons[1].id, description: "Devolución posterior al cierre del bloque autorizado.", status: "CUMPLIDA", date: "2026-08-18T12:20:00-05:00", imposedBy: "Carol Velasco", fulfilledAt: "2026-08-21T09:10:00-05:00", fulfilledBy: "Jhon Rodríguez", deliveredItems: "Constancia firmada y elemento prestado entregado en buen estado." },
  { id: "11000000-0000-4000-8000-000000000004", folio: "MUL-2026-0095", student: fineStudents[1], reasonId: initialFineReasons[3].id, description: "Instalación de software no autorizado durante una práctica.", status: "CUMPLIDA", date: "2026-08-14T10:05:00-05:00", imposedBy: "Kaleth Molina", fulfilledAt: "2026-08-19T15:30:00-05:00", fulfilledBy: "Ivan Prado", deliveredItems: "Formato de compromiso diligenciado y equipo revisado por soporte." },
  { id: "11000000-0000-4000-8000-000000000005", folio: "MUL-2026-0094", student: fineStudents[4], reasonId: initialFineReasons[2].id, description: "Reporte inicial de pérdida de adaptador de red.", status: "ANULADA", date: "2026-08-12T17:40:00-05:00", imposedBy: "Jhon Rodríguez", annulledAt: "2026-08-13T08:25:00-05:00", annulledBy: "Ivan Prado", annulmentReason: "El elemento fue encontrado en el inventario de otra aula y no existió responsabilidad de la estudiante." },
];
