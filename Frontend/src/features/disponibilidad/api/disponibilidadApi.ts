import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export type DisponibilidadApi = { aula: { id: string; codigo: string; ubicacion: string; piso: number | null; capacidad: number }; estadoCalculado: string; motivo: string; fuentes: Array<{ tipo: string; descripcion: string }> };
export const consultarDisponibilidad = (fecha: string, horaInicio: string, horaFin: string) => solicitarAulas<DisponibilidadApi[]>(`/disponibilidad-aulas?fecha=${fecha}&horaInicio=${horaInicio}&horaFin=${horaFin}`, token());
