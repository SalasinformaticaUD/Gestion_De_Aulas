import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { Room, RoomStatus } from "@/features/aulas/types";

type EstadoAulaApi = "OPERATIVA" | "MANTENIMIENTO" | "FUERA_DE_SERVICIO";

type AulaApi = {
  id: string;
  codigo: string;
  ubicacion: string;
  piso: number | null;
  capacidad: number;
  estado: EstadoAulaApi;
  anioAdquisicion: number | null;
  marca: string | null;
  modelo: string | null;
  proyectoCurricular: { id: string; nombre: string } | null;
  software?: Array<{ nombre: string; version: string }>;
  historial?: Array<{ fecha: string; descripcion: string; responsable: string | null }>;
};

export type CrearAulaInput = {
  codigo: string;
  ubicacion: string;
  capacidad: number;
  estado: EstadoAulaApi;
  anioAdquisicion?: number;
  marca?: string;
  modelo?: string;
};

function estadoInterfaz(estado: EstadoAulaApi): RoomStatus {
  return estado === "MANTENIMIENTO" ? "mantenimiento" : "disponible";
}

function aRoom(aula: AulaApi): Room {
  return {
    id: aula.id,
    code: aula.codigo,
    floor: aula.piso ?? 0,
    capacity: aula.capacidad,
    status: estadoInterfaz(aula.estado),
    software: (aula.software ?? []).map((item) => ({ name: item.nombre, version: item.version, licenses: 0, status: "activo" })),
    workstations: [],
    location: aula.ubicacion,
    hardware: [aula.marca, aula.modelo].filter(Boolean).join(" · ") || "Sin información",
    curriculumProject: aula.proyectoCurricular?.nombre ?? "Sin asignar",
    acquisitionYear: aula.anioAdquisicion ?? 0,
    history: (aula.historial ?? []).map((item) => ({ timestamp: new Date(item.fecha).toLocaleString("es-CO"), action: item.descripcion, responsible: item.responsable ?? "Sistema" })),
  };
}

function tokenActual() {
  const token = obtenerSesion()?.tokenAcceso;
  if (!token) throw new Error("La sesión expiró. Inicie sesión de nuevo para administrar aulas.");
  return token;
}

export async function listarAulas() {
  const aulas = await solicitarAulas<AulaApi[]>("/aulas", tokenActual());
  return aulas.map(aRoom);
}

export async function crearAula(input: CrearAulaInput) {
  const aula = await solicitarAulas<AulaApi>("/aulas", tokenActual(), {
    method: "POST",
    body: JSON.stringify(input),
  });
  return aRoom(aula);
}
