import type { Room } from "@/features/aulas/types";

const createWorkstations = (capacity: number) =>
  Array.from({ length: capacity }, (_, index) => ({ number: index + 1, status: "operativo" as const }));

const software = (names: string[], capacity: number) =>
  names.map((name, index) => ({ name, version: index === 0 ? "v2023-09" : index === 1 ? "v19" : "v8.0", licenses: capacity, status: "activo" as const }));

const history = [
  { timestamp: "2026-08-05 07:00", action: "Apertura del aula", responsible: "Monitor Sanchez" },
  { timestamp: "2026-08-04 18:30", action: "Cierre del aula", responsible: "Monitor Sanchez" },
  { timestamp: "2026-08-04 14:00", action: "Clase: Calculo III — Mg. Perez", responsible: "Sistema" },
  { timestamp: "2026-08-03 09:00", action: "Mantenimiento preventivo completado", responsible: "Tecnico Garcia" },
  { timestamp: "2026-08-01 07:00", action: "Actualizacion de software — MS Office", responsible: "Tecnico Ramirez" },
];

export const rooms: Room[] = [
  { id: "aula-401", code: "401", floor: 4, capacity: 40, status: "en-clase", software: software(["AutoCAD", "MS Office", "Matlab"], 40), workstations: createWorkstations(40), location: "Edificio Sabio de Caldas · Piso 4", hardware: "40 equipos de cómputo", curriculumProject: "Facultad de Ingeniería", acquisitionYear: 2023, history },
  { id: "aula-402", code: "402", floor: 4, capacity: 40, status: "disponible", software: software(["Eclipse", "NetBeans", "MySQL"], 40), workstations: createWorkstations(40), location: "Edificio Sabio de Caldas · Piso 4", hardware: "40 equipos de cómputo", curriculumProject: "Facultad de Ingeniería", acquisitionYear: 2023, history },
  ...[
    ["403", 4, 35, "reservada", ["MS Office", "SPSS", "R Studio"]], ["404", 4, 40, "en-clase", ["AutoCAD", "Revit", "SketchUp"]], ["405", 4, 42, "disponible", ["Python", "Anaconda", "VS Code"]], ["406", 4, 40, "mantenimiento", ["MATLAB", "Simulink", "Maple"]], ["501", 5, 38, "disponible", ["Android Studio", "Flutter", "Git"]], ["502", 5, 40, "en-clase", ["Adobe CC", "Figma", "Blender"]], ["503", 5, 40, "disponible", ["MS Office", "Power BI", "Tableau"]], ["504", 5, 36, "reservada", ["C++", "Visual Studio", "Git"]], ["505", 5, 40, "en-clase", ["SAP", "Oracle DB", "MS SQL"]], ["506", 5, 40, "disponible", ["Python", "TensorFlow", "Keras"]], ["601", 6, 44, "en-clase", ["AutoCAD", "ETABS", "SAP2000"]], ["602", 6, 40, "disponible", ["MS Office", "Project", "Visio"]], ["603", 6, 38, "reservada", ["Java", "Spring Boot", "Docker"]], ["604", 6, 40, "disponible", ["R Studio", "SPSS", "Eviews"]], ["605", 6, 40, "mantenimiento", ["MS Office", "Teams", "Zoom"]], ["606", 6, 42, "en-clase", ["Unity", "Unreal Engine", "Blender"]], ["701", 7, 40, "disponible", ["AutoCAD", "Civil 3D", "HEC-RAS"]], ["702", 7, 40, "disponible", ["MS Office", "Python", "Jupyter"]],
  ].map(([code, floor, capacity, status, apps]) => ({ id: `aula-${code}`, code: code as string, floor: floor as number, capacity: capacity as number, status: status as Room["status"], software: software(apps as string[], capacity as number), workstations: createWorkstations(capacity as number), location: `Edificio Sabio de Caldas · Piso ${floor}`, hardware: `${capacity} equipos de cómputo`, curriculumProject: "Facultad de Ingeniería", acquisitionYear: 2023, history })),
];
