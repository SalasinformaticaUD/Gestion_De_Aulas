import { rooms } from "@/features/aulas/data/rooms";
import type {
  AvailabilityHistoryEvent,
  AvailabilityResult,
  AvailabilityRoom,
  AvailabilitySourceType,
  AvailabilityState,
} from "@/features/disponibilidad/types";

export const operatingBlocks = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"] as const;

export const characteristicOptions = ["Aire acondicionado", "Accesibilidad", "Videobeam fijo", "Alta capacidad"];

const softwareId = (name: string) => `software-${name.toLocaleLowerCase("es").replaceAll(/[^a-z0-9]+/g, "-")}`;

export const availabilityRooms: AvailabilityRoom[] = rooms.map((room, index) => ({
  id: room.id,
  code: room.code,
  location: room.location,
  floor: room.floor,
  capacity: room.capacity,
  physicalStatus: room.status === "mantenimiento" ? "MANTENIMIENTO" : "OPERATIVA",
  software: room.software.map((item) => ({ id: softwareId(item.name), name: item.name })),
  characteristics: [
    ...(index % 2 === 0 ? ["Aire acondicionado"] : []),
    ...(room.code.endsWith("1") || room.code.endsWith("2") ? ["Accesibilidad"] : []),
    ...(index % 3 !== 1 ? ["Videobeam fijo"] : []),
    ...(room.capacity >= 40 ? ["Alta capacidad"] : []),
  ],
}));

type ActivityRule = {
  roomCode: string;
  startTime: string;
  endTime: string;
  type: AvailabilitySourceType;
  description: string;
  status?: string;
};

const activities: ActivityRule[] = [
  { roomCode: "401", startTime: "08:00", endTime: "10:00", type: "clase-programada", description: "Resistencia de Materiales · Grupo 01 · Dr. Carlos Mendoza", status: "PENDIENTE" },
  { roomCode: "401", startTime: "10:00", endTime: "12:00", type: "clase-programada", description: "Mecánica de Sólidos · Grupo 02 · Ing. Andrea Peña", status: "ASISTIO" },
  { roomCode: "402", startTime: "10:00", endTime: "12:00", type: "clase-programada", description: "Estructuras de Datos · Grupo 03 · Mg. Andrés Pérez", status: "PENDIENTE" },
  { roomCode: "403", startTime: "08:00", endTime: "10:00", type: "prestamo-docente", description: "Préstamo docente para Estadística Aplicada", status: "APROBADO" },
  { roomCode: "404", startTime: "06:00", endTime: "08:00", type: "clase-programada", description: "Diseño Asistido por Computador · Grupo 01 · Ing. Laura Vargas", status: "ASISTIO" },
  { roomCode: "405", startTime: "14:00", endTime: "16:00", type: "practica-libre", description: "Práctica libre · Estudiante 20241020118", status: "ACTIVO" },
  { roomCode: "501", startTime: "16:00", endTime: "18:00", type: "tarea-operativa", description: "Revisión preventiva del sistema eléctrico", status: "EN_PROCESO" },
  { roomCode: "502", startTime: "08:00", endTime: "10:00", type: "clase-programada", description: "Diseño Gráfico Digital · Grupo 02 · Dis. Paula Ríos", status: "PENDIENTE" },
  { roomCode: "503", startTime: "12:00", endTime: "14:00", type: "restriccion", description: "Actualización masiva de Power BI", status: "RESTRICCION" },
  { roomCode: "504", startTime: "10:00", endTime: "12:00", type: "prestamo-docente", description: "Préstamo docente para Programación II", status: "ACTIVO" },
  { roomCode: "505", startTime: "06:00", endTime: "08:00", type: "clase-programada", description: "Ciencia de Datos · Grupo 01 · Dr. Felipe Gómez", status: "ASISTIO" },
  { roomCode: "506", startTime: "18:00", endTime: "20:00", type: "practica-libre", description: "Práctica libre · Estudiante 20232020041", status: "ACTIVO" },
  { roomCode: "601", startTime: "08:00", endTime: "10:00", type: "clase-programada", description: "Análisis Estructural · Grupo 04 · Mg. Roberto Castro", status: "AUSENTE" },
  { roomCode: "602", startTime: "14:00", endTime: "16:00", type: "prestamo-docente", description: "Préstamo docente para Gestión de Proyectos", status: "APROBADO" },
  { roomCode: "603", startTime: "12:00", endTime: "14:00", type: "practica-libre", description: "Práctica libre · Estudiante 20221020076", status: "ACTIVO" },
  { roomCode: "604", startTime: "18:00", endTime: "20:00", type: "clase-programada", description: "Econometría · Grupo 01 · Dra. María Torres", status: "PENDIENTE" },
  { roomCode: "606", startTime: "14:00", endTime: "16:00", type: "clase-programada", description: "Videojuegos y Simulación · Grupo 02 · Ing. Diana López", status: "PENDIENTE" },
  { roomCode: "701", startTime: "18:00", endTime: "20:00", type: "prestamo-docente", description: "Préstamo docente para Hidráulica", status: "APROBADO" },
  { roomCode: "702", startTime: "20:00", endTime: "22:00", type: "clase-programada", description: "Analítica de Datos · Grupo 01 · Mg. Jorge Salcedo", status: "PENDIENTE" },
];

const activityState: Record<Exclude<AvailabilitySourceType, "estado-aula">, AvailabilityState> = {
  restriccion: "bloqueada",
  "clase-programada": "ocupada",
  "prestamo-docente": "reservada",
  "practica-libre": "reservada",
  "tarea-operativa": "bloqueada",
};

const activityReason: Record<Exclude<AvailabilitySourceType, "estado-aula">, string> = {
  restriccion: "Existe una restricción operativa vigente.",
  "clase-programada": "Existe una clase programada durante el bloque.",
  "prestamo-docente": "Existe un préstamo docente aprobado o activo.",
  "practica-libre": "Existe una práctica libre activa.",
  "tarea-operativa": "Existe una tarea operativa que afecta la disponibilidad.",
};

const toSource = (rule: ActivityRule) => ({
  type: rule.type,
  id: `${rule.type}-${rule.roomCode}-${rule.startTime}`,
  description: rule.description,
  status: rule.status,
});

export function getEndTime(startTime: string) {
  return `${String(Number(startTime.slice(0, 2)) + 2).padStart(2, "0")}:00`;
}

export function getAvailabilityForBlock(room: AvailabilityRoom, date: string, startTime: string): AvailabilityResult {
  const endTime = getEndTime(startTime);
  const current = activities.find((item) => item.roomCode === room.code && item.startTime === startTime);
  const next = activities
    .filter((item) => item.roomCode === room.code && item.startTime > startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  let calculatedState: AvailabilityState = "disponible";
  let reason = "No existen actividades ni restricciones para el bloque.";
  let sources = current ? [toSource(current)] : [];

  if (room.physicalStatus !== "OPERATIVA") {
    calculatedState = room.physicalStatus === "MANTENIMIENTO" ? "mantenimiento" : "bloqueada";
    reason = room.physicalStatus === "MANTENIMIENTO" ? "El estado operativo del aula tiene prioridad." : "El aula está fuera de servicio.";
    sources = [{ type: "estado-aula", id: room.id, description: reason, status: room.physicalStatus }, ...sources];
  } else if (current) {
    calculatedState = activityState[current.type as Exclude<AvailabilitySourceType, "estado-aula">];
    reason = activityReason[current.type as Exclude<AvailabilitySourceType, "estado-aula">];
  }

  return {
    room,
    block: { date, startTime, endTime, durationHours: 2 },
    calculatedState,
    reason,
    currentBlock: sources[0] ?? null,
    nextActivity: next ? { ...toSource(next), startTime: next.startTime, endTime: next.endTime } : null,
    sources,
    calculatedAt: `${date}T${startTime}:00.000-05:00`,
    persisted: false,
  };
}

export function getDailyAvailability(date: string) {
  return operatingBlocks.map((startTime) => ({
    startTime,
    endTime: getEndTime(startTime),
    rooms: availabilityRooms.map((room) => getAvailabilityForBlock(room, date, startTime)),
  }));
}

const historySeeds: Array<Omit<AvailabilityHistoryEvent, "id"> & { roomCode: string }> = [
  { roomCode: "401", type: "clase-programada", start: "2026-08-25T08:00:00-05:00", end: "2026-08-25T10:00:00-05:00", description: "Resistencia de Materiales · Grupo 01", status: "PENDIENTE" },
  { roomCode: "401", type: "tarea-operativa", start: "2026-08-23T12:00:00-05:00", end: "2026-08-23T14:00:00-05:00", description: "Mantenimiento preventivo de puestos", status: "FINALIZADA" },
  { roomCode: "402", type: "practica-libre", start: "2026-08-24T14:00:00-05:00", end: "2026-08-24T16:00:00-05:00", description: "Práctica libre · Estudiante 20231020111", status: "DEVUELTO" },
  { roomCode: "403", type: "prestamo-docente", start: "2026-08-25T08:00:00-05:00", end: "2026-08-25T10:00:00-05:00", description: "Préstamo docente para Estadística Aplicada", status: "APROBADO" },
  { roomCode: "404", type: "clase-programada", start: "2026-08-22T06:00:00-05:00", end: "2026-08-22T08:00:00-05:00", description: "Diseño Asistido por Computador · Grupo 01", status: "ASISTIO" },
  { roomCode: "501", type: "restriccion", start: "2026-08-21T10:00:00-05:00", end: "2026-08-21T12:00:00-05:00", description: "Intervención de red programada", status: "CERRADA" },
  { roomCode: "502", type: "clase-programada", start: "2026-08-25T08:00:00-05:00", end: "2026-08-25T10:00:00-05:00", description: "Diseño Gráfico Digital · Grupo 02", status: "PENDIENTE" },
  { roomCode: "601", type: "clase-programada", start: "2026-08-25T08:00:00-05:00", end: "2026-08-25T10:00:00-05:00", description: "Análisis Estructural · Grupo 04", status: "AUSENTE" },
  { roomCode: "602", type: "prestamo-docente", start: "2026-08-20T14:00:00-05:00", end: "2026-08-20T16:00:00-05:00", description: "Préstamo docente para Gestión de Proyectos", status: "FINALIZADO" },
  { roomCode: "701", type: "practica-libre", start: "2026-08-19T16:00:00-05:00", end: "2026-08-19T18:00:00-05:00", description: "Práctica libre · Estudiante 20221020102", status: "DEVUELTO" },
];

export function getDerivedHistory(roomCode: string, from: string, to: string): AvailabilityHistoryEvent[] {
  return historySeeds
    .filter((event) => event.roomCode === roomCode && event.start.slice(0, 10) >= from && event.start.slice(0, 10) <= to)
    .map(({ roomCode: _roomCode, ...event }, index) => ({ ...event, id: `history-${roomCode}-${index}` }))
    .sort((a, b) => b.start.localeCompare(a.start));
}

