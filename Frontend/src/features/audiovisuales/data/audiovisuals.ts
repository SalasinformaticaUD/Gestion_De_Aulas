import type { AudiovisualEquipment, AudiovisualLoan } from "@/features/audiovisuales/types";

export const audiovisualEquipment: AudiovisualEquipment[] = [
  { id: "eq-vb-001", inventoryCode: "VB-001", name: "Videobeam Epson EB-X41", type: "Videobeam", status: "DISPONIBLE", usageHours: 148, loanCount: 62 },
  { id: "eq-vb-002", inventoryCode: "VB-002", name: "Videobeam BenQ MS550", type: "Videobeam", status: "PRESTADO", usageHours: 203, loanCount: 85 },
  { id: "eq-vb-003", inventoryCode: "VB-003", name: "Videobeam ViewSonic PA503W", type: "Videobeam", status: "PRESTADO", usageHours: 267, loanCount: 91 },
  { id: "eq-vb-004", inventoryCode: "VB-004", name: "Videobeam Epson EB-E01", type: "Videobeam", status: "DISPONIBLE", usageHours: 112, loanCount: 48 },
  { id: "eq-ex-001", inventoryCode: "EX-001", name: "Extensión multicontacto 5 m", type: "Extensión", status: "DISPONIBLE", usageHours: 0, loanCount: 130 },
  { id: "eq-ex-002", inventoryCode: "EX-002", name: "Extensión multicontacto 10 m", type: "Extensión", status: "PRESTADO", usageHours: 0, loanCount: 95 },
  { id: "eq-pt-001", inventoryCode: "PT-001", name: "Puntero láser Logitech", type: "Puntero", status: "DISPONIBLE", usageHours: 0, loanCount: 74 },
  { id: "eq-pt-002", inventoryCode: "PT-002", name: "Puntero láser Kensington", type: "Puntero", status: "DISPONIBLE", usageHours: 0, loanCount: 53 },
  { id: "eq-ad-001", inventoryCode: "AD-001", name: "Adaptador HDMI–VGA", type: "Adaptador", status: "MANTENIMIENTO", usageHours: 0, loanCount: 210, observation: "Conector VGA con falso contacto." },
  { id: "eq-ad-002", inventoryCode: "AD-002", name: "Adaptador USB-C–HDMI", type: "Adaptador", status: "DISPONIBLE", usageHours: 0, loanCount: 88 },
];

export const audiovisualLoans: AudiovisualLoan[] = [
  { id: "PA-2026-0085", teacher: "Dra. María Torres", room: "403", checkoutAt: "2026-08-19T07:05", dueAt: "2026-08-19T09:00", status: "ACTIVO", equipmentIds: ["eq-vb-002"], deliveredBy: "Jhon Rodríguez" },
  { id: "PA-2026-0086", teacher: "Mg. Andrés Pérez", room: "402", checkoutAt: "2026-08-19T08:02", dueAt: "2026-08-19T11:00", status: "VENCIDO", equipmentIds: ["eq-vb-003", "eq-ex-002"], deliveredBy: "Jhon Rodríguez" },
  { id: "PA-2026-0084", teacher: "Ing. Laura Vargas", room: "404", checkoutAt: "2026-08-18T14:01", dueAt: "2026-08-18T16:00", returnedAt: "2026-08-18T15:54", status: "DEVUELTO", equipmentIds: ["eq-vb-004"], deliveredBy: "Jhon Rodríguez" },
];

