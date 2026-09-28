import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export type DisponibilidadApi = { aula: { id: string; codigo: string; ubicacion: string; capacidad: number }; estadoCalculado: string; motivo: string; fuentes: Array<{ tipo: string; descripcion: string; estado?: string }> };
export type ResumenDisponibilidadDiaApi = {
  fecha: string;
  rangoOperativo: { horaInicio: string; horaFin: string; duracionBloqueHoras: number };
  bloques: Array<{ horaInicio: string; horaFin: string; aulas: DisponibilidadApi[] }>;
  calculadoEn: string;
  persistido: false;
};
export const consultarDisponibilidad = (fecha: string, horaInicio: string, horaFin: string, softwareId?: string) => solicitarAulas<DisponibilidadApi[]>(`/disponibilidad-aulas?fecha=${fecha}&horaInicio=${horaInicio}&horaFin=${horaFin}${softwareId ? `&softwareId=${encodeURIComponent(softwareId)}` : ""}`, token());
export const consultarResumenDia = (fecha: string) => solicitarAulas<ResumenDisponibilidadDiaApi>(`/disponibilidad-aulas/resumen-dia?fecha=${fecha}`, token());
