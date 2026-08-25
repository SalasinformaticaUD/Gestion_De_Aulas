export type ApplicationKey = "aulas" | "monitores";

export type ApplicationDefinition = {
  key: ApplicationKey;
  name: string;
  description: string;
  loginPath: string;
  destination: string;
};

export const applications: Record<ApplicationKey, ApplicationDefinition> = {
  aulas: { key: "aulas", name: "Gestión de Aulas", description: "Control de horarios, ocupación, estados y solicitudes de reservas de aulas de software.", loginPath: "/login?app=aulas", destination: "/gestion-aulas" },
  monitores: { key: "monitores", name: "Gestión de Monitores", description: "Asignación, turnos, asistencia y reportes semanales de los monitores de laboratorio.", loginPath: "/login?app=monitores", destination: "/gestion-monitores" },
};

export function getApplication(key: string | null): ApplicationDefinition {
  return key === "monitores" ? applications.monitores : applications.aulas;
}
