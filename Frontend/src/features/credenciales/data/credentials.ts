import type { CredentialUser, OperationalCredential } from "@/features/credenciales/types";

export const credentialUsers: CredentialUser[] = [
  { id: "80000000-0000-4000-8000-000000000001", name: "Jhon Rodríguez", role: "Técnico · Almacén", initials: "JR" },
  { id: "80000000-0000-4000-8000-000000000002", name: "Carol Velasco", role: "Monitora de sistemas", initials: "CV" },
  { id: "80000000-0000-4000-8000-000000000003", name: "Ivan Prado", role: "Administrador operativo", initials: "IP" },
  { id: "80000000-0000-4000-8000-000000000004", name: "Kaleth Molina", role: "Soporte de plataforma", initials: "KM" },
  { id: "80000000-0000-4000-8000-000000000005", name: "Laura Vargas", role: "Coordinación académica", initials: "LV" },
];

export const initialCredentials: OperationalCredential[] = [
  { id: "90000000-0000-4000-8000-000000000001", code: "CRD-2026-0048", name: "Administrador de red académica", category: "Infraestructura", username: "sgoas-net-admin", description: "Acceso administrativo a los equipos de comunicación de las aulas.", status: "ACTIVA", createdAt: "2026-07-12T09:10:00-05:00", updatedAt: "2026-08-22T16:40:00-05:00", access: [
    { userId: credentialUsers[0].id, canView: true, canEdit: true }, { userId: credentialUsers[2].id, canView: true, canEdit: true }, { userId: credentialUsers[3].id, canView: true, canEdit: false },
  ] },
  { id: "90000000-0000-4000-8000-000000000002", code: "CRD-2026-0047", name: "Licenciamiento Autodesk", category: "Licenciamiento", username: "licencias.autodesk@udistrital.edu.co", description: "Cuenta institucional para activación de AutoCAD y Revit.", status: "ACTIVA", createdAt: "2026-07-08T11:25:00-05:00", updatedAt: "2026-08-18T08:15:00-05:00", access: [
    { userId: credentialUsers[0].id, canView: true, canEdit: false }, { userId: credentialUsers[2].id, canView: true, canEdit: true },
  ] },
  { id: "90000000-0000-4000-8000-000000000003", code: "CRD-2026-0046", name: "Panel de reservas institucional", category: "Servicios institucionales", username: "operacion.aulas", description: "Cuenta operativa del servicio de reservas y consulta de ocupación.", status: "ACTIVA", createdAt: "2026-06-24T14:30:00-05:00", updatedAt: "2026-08-20T12:05:00-05:00", access: [
    { userId: credentialUsers[0].id, canView: true, canEdit: true }, { userId: credentialUsers[1].id, canView: true, canEdit: false }, { userId: credentialUsers[4].id, canView: true, canEdit: false },
  ] },
  { id: "90000000-0000-4000-8000-000000000004", code: "CRD-2026-0045", name: "Base de datos de inventario legado", category: "Bases de datos", username: "inventory_reader", description: "Acceso de solo lectura al inventario histórico migrado.", status: "INACTIVA", createdAt: "2026-05-15T10:00:00-05:00", updatedAt: "2026-08-01T17:42:00-05:00", access: [
    { userId: credentialUsers[2].id, canView: true, canEdit: true },
  ] },
  { id: "90000000-0000-4000-8000-000000000005", code: "CRD-2026-0044", name: "Administración de antivirus", category: "Seguridad", username: "endpoint-admin", description: "Consola de protección de los equipos de las aulas.", status: "ACTIVA", createdAt: "2026-04-28T08:45:00-05:00", updatedAt: "2026-08-23T09:20:00-05:00", access: [
    { userId: credentialUsers[0].id, canView: true, canEdit: false }, { userId: credentialUsers[3].id, canView: true, canEdit: true },
  ] },
];
