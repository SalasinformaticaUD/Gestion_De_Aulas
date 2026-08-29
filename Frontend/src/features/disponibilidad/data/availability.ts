import { rooms } from "@/features/aulas/data/rooms";
import type { AvailabilityHistoryEvent, AvailabilityResult, AvailabilityRoom, AvailabilityState } from "@/features/disponibilidad/types";

export const operatingBlocks = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"] as const;
export const characteristicOptions = ["Aire acondicionado", "Accesibilidad", "Videobeam fijo", "Alta capacidad"];

export const availabilityRooms: AvailabilityRoom[] = rooms.map((room) => ({
  id: room.id,
  code: room.code,
  location: room.location,
  floor: room.floor,
  capacity: room.capacity,
  physicalStatus: room.status === "mantenimiento" ? "MANTENIMIENTO" : "OPERATIVA",
  software: room.software.map((item) => ({ id: `software-${item.name}`, name: item.name })),
  characteristics: [],
}));

export function getEndTime(startTime: string) {
  return `${String(Number(startTime.slice(0, 2)) + 2).padStart(2, "0")}:00`;
}

export function getAvailabilityForBlock(room: AvailabilityRoom, date: string, startTime: string): AvailabilityResult {
  const endTime = getEndTime(startTime);
  let calculatedState: AvailabilityState = "disponible";
  let reason = "No existen actividades ni restricciones para el bloque.";
  const sources = [] as AvailabilityResult["sources"];

  if (room.physicalStatus !== "OPERATIVA") {
    calculatedState = room.physicalStatus === "MANTENIMIENTO" ? "mantenimiento" : "bloqueada";
    reason = room.physicalStatus === "MANTENIMIENTO" ? "El aula está en mantenimiento." : "El aula está fuera de servicio.";
  }

  return {
    room,
    block: { date, startTime, endTime, durationHours: 2 },
    calculatedState,
    reason,
    currentBlock: null,
    nextActivity: null,
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

export function getDerivedHistory(_roomCode: string, _from: string, _to: string): AvailabilityHistoryEvent[] {
  return [];
}
