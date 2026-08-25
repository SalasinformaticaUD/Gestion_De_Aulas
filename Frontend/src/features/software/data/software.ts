import type { InstalledSoftware, SoftwareAssignment, SoftwareImport } from "@/features/software/types";

export const initialSoftware: InstalledSoftware[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "AutoCAD", version: "2025", description: "Diseño asistido por computador" },
  { id: "10000000-0000-4000-8000-000000000002", name: "MATLAB", version: "R2025a", description: "Cálculo numérico y simulación" },
  { id: "10000000-0000-4000-8000-000000000003", name: "Microsoft Office", version: "365", description: "Suite de productividad institucional" },
  { id: "10000000-0000-4000-8000-000000000004", name: "Visual Studio Code", version: "1.103", description: "Editor para desarrollo de software" },
  { id: "10000000-0000-4000-8000-000000000005", name: "MySQL Workbench", version: "8.0", description: "Administración de bases de datos" },
  { id: "10000000-0000-4000-8000-000000000006", name: "Adobe Creative Cloud", version: "2026", description: "Herramientas de diseño y creación audiovisual" },
  { id: "10000000-0000-4000-8000-000000000007", name: "Python", version: "3.13", description: "Entorno de programación y análisis de datos" },
  { id: "10000000-0000-4000-8000-000000000008", name: "RStudio", version: "2025.05", description: "Entorno de análisis estadístico" },
  { id: "10000000-0000-4000-8000-000000000009", name: "Revit", version: "2025", description: "Modelado de información para construcción" },
  { id: "10000000-0000-4000-8000-000000000010", name: "Figma", version: "Desktop 125", description: "Diseño colaborativo de interfaces" },
];

export const initialAssignments: SoftwareAssignment[] = [
  { roomId: "aula-401", softwareId: initialSoftware[0].id, installedAt: "2026-07-12" },
  { roomId: "aula-401", softwareId: initialSoftware[1].id, installedAt: "2026-07-12" },
  { roomId: "aula-401", softwareId: initialSoftware[2].id, installedAt: "2026-07-10" },
  { roomId: "aula-402", softwareId: initialSoftware[3].id, installedAt: "2026-08-02" },
  { roomId: "aula-402", softwareId: initialSoftware[4].id, installedAt: "2026-08-02" },
  { roomId: "aula-402", softwareId: initialSoftware[6].id, installedAt: "2026-08-02" },
  { roomId: "aula-403", softwareId: initialSoftware[2].id, installedAt: "2026-06-18" },
  { roomId: "aula-403", softwareId: initialSoftware[7].id, installedAt: "2026-06-18" },
  { roomId: "aula-404", softwareId: initialSoftware[0].id, installedAt: "2026-07-15" },
  { roomId: "aula-404", softwareId: initialSoftware[8].id, installedAt: "2026-07-15" },
  { roomId: "aula-405", softwareId: initialSoftware[3].id, installedAt: "2026-08-08" },
  { roomId: "aula-405", softwareId: initialSoftware[6].id, installedAt: "2026-08-08" },
  { roomId: "aula-502", softwareId: initialSoftware[5].id, installedAt: "2026-07-28" },
  { roomId: "aula-502", softwareId: initialSoftware[9].id, installedAt: "2026-07-28" },
  { roomId: "aula-503", softwareId: initialSoftware[2].id, installedAt: "2026-08-11" },
  { roomId: "aula-506", softwareId: initialSoftware[3].id, installedAt: "2026-08-09" },
  { roomId: "aula-506", softwareId: initialSoftware[6].id, installedAt: "2026-08-09" },
  { roomId: "aula-604", softwareId: initialSoftware[7].id, installedAt: "2026-07-21" },
];

export const initialImports: SoftwareImport[] = [
  { id: "IMP-2026-0041", fileName: "inventario_agosto.json", createdAt: "2026-08-20T20:34:00-05:00", userName: "Kaleth Molina", totalRecords: 18, processedRecords: 18, errorRecords: 0, result: "EXITOSA", errors: [] },
  { id: "IMP-2026-0040", fileName: "actualizacion_laboratorios.json", createdAt: "2026-08-18T14:12:00-05:00", userName: "Ivan Prado", totalRecords: 12, processedRecords: 10, errorRecords: 2, result: "PARCIAL", errors: [
    { row: 4, roomCode: "408", name: "ArcGIS", version: "Pro 3.4", error: "No existe un aula con el código indicado." },
    { row: 9, roomCode: "508", name: "Docker Desktop", version: "4.43", error: "No existe un aula con el código indicado." },
  ] },
  { id: "IMP-2026-0039", createdAt: "2026-08-15T09:05:00-05:00", userName: "Coordinación", totalRecords: 4, processedRecords: 0, errorRecords: 4, result: "FALLIDA", errors: [] },
];
