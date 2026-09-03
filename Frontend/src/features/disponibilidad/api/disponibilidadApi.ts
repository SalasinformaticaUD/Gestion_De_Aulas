import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export type DisponibilidadApi = { aula: { id: string; codigo: string; ubicacion: string; capacidad: number }; estadoCalculado: string; motivo: string; fuentes: Array<{ tipo: string; descripcion: string; estado?: string }> };
export const consultarDisponibilidad = (fecha: string, horaInicio: string, horaFin: string, softwareId?: string) => solicitarAulas<DisponibilidadApi[]>(`/disponibilidad-aulas?fecha=${fecha}&horaInicio=${horaInicio}&horaFin=${horaFin}${softwareId ? `&softwareId=${encodeURIComponent(softwareId)}` : ""}`, token());
