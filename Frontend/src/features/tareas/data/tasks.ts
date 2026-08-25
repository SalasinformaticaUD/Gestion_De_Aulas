import type { OperationalTask, TaskUser } from "@/features/tareas/types";

export const taskUsers: TaskUser[] = [
  { id: "b0000000-0000-4000-8000-000000000001", name: "Jhon Rodríguez", role: "Técnico de almacén", initials: "JR" },
  { id: "b0000000-0000-4000-8000-000000000002", name: "Carol Velasco", role: "Monitora de sistemas", initials: "CV" },
  { id: "b0000000-0000-4000-8000-000000000003", name: "Ivan Prado", role: "Administrador operativo", initials: "IP" },
  { id: "b0000000-0000-4000-8000-000000000004", name: "Kaleth Molina", role: "Soporte de plataforma", initials: "KM" },
  { id: "b0000000-0000-4000-8000-000000000005", name: "Sandra Ramírez", role: "Técnica de laboratorios", initials: "SR" },
];

export const initialTasks: OperationalTask[] = [
  { id: "c0000000-0000-4000-8000-000000000001", code: "TAR-2026-0218", title: "Revisar conectividad de los puestos 07 y 08", description: "Validar puntos de red y documentar el diagnóstico para soporte de infraestructura.", status: "PENDIENTE", roomId: "aula-402", roomCode: "402", responsibleId: taskUsers[3].id, affectsAvailability: false, start: "2026-08-26T08:00:00-05:00", end: "2026-08-26T10:00:00-05:00" },
  { id: "c0000000-0000-4000-8000-000000000002", code: "TAR-2026-0217", title: "Actualizar licencias de Power BI", description: "Renovar el inicio de sesión institucional en todos los equipos del aula.", status: "PENDIENTE", roomId: "aula-503", roomCode: "503", responsibleId: taskUsers[1].id, affectsAvailability: true, start: "2026-08-27T12:00:00-05:00", end: "2026-08-27T14:00:00-05:00" },
  { id: "c0000000-0000-4000-8000-000000000003", code: "TAR-2026-0216", title: "Inventariar adaptadores de video", description: "Verificar existencias de HDMI, DisplayPort y USB-C para actualizar el inventario.", status: "PENDIENTE", responsibleId: taskUsers[0].id, affectsAvailability: false },
  { id: "c0000000-0000-4000-8000-000000000004", code: "TAR-2026-0215", title: "Mantenimiento preventivo del sistema eléctrico", description: "Revisión de estabilizadores y tomas eléctricas del costado occidental.", status: "EN_PROCESO", roomId: "aula-406", roomCode: "406", responsibleId: taskUsers[4].id, affectsAvailability: true, start: "2026-08-25T14:00:00-05:00", end: "2026-08-27T18:00:00-05:00" },
  { id: "c0000000-0000-4000-8000-000000000005", code: "TAR-2026-0214", title: "Configurar imagen base de Windows", description: "Preparar la imagen institucional para el siguiente proceso de despliegue.", status: "EN_PROCESO", responsibleId: taskUsers[3].id, affectsAvailability: false, start: "2026-08-24T09:00:00-05:00", end: "2026-08-28T17:00:00-05:00" },
  { id: "c0000000-0000-4000-8000-000000000006", code: "TAR-2026-0213", title: "Reemplazar control del videobeam", description: "Control configurado y entregado a coordinación.", status: "COMPLETADA", roomId: "aula-405", roomCode: "405", responsibleId: taskUsers[0].id, affectsAvailability: false, start: "2026-08-23T10:00:00-05:00", end: "2026-08-23T11:30:00-05:00" },
  { id: "c0000000-0000-4000-8000-000000000007", code: "TAR-2026-0212", title: "Verificar instalación de RStudio", status: "COMPLETADA", roomId: "aula-604", roomCode: "604", responsibleId: taskUsers[1].id, affectsAvailability: false, start: "2026-08-22T14:00:00-05:00", end: "2026-08-22T16:00:00-05:00" },
  { id: "c0000000-0000-4000-8000-000000000008", code: "TAR-2026-0211", title: "Trasladar equipos de respaldo", description: "Actividad cancelada por cambio en la planeación de inventario.", status: "CANCELADA", responsibleId: taskUsers[2].id, affectsAvailability: false, start: "2026-08-21T08:00:00-05:00", end: "2026-08-21T12:00:00-05:00" },
];
