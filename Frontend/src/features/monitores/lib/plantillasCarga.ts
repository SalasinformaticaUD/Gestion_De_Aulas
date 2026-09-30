import * as XLSX from "xlsx";

type Plantilla = "monitores" | "horarios";

const plantillas: Record<Plantilla, { nombre: string; hoja: string; columnas: string[]; ejemplo: Record<string, string> }> = {
  monitores: {
    nombre: "plantilla_carga_monitores.xlsx",
    hoja: "Monitores",
    columnas: ["email", "full_name", "codigo_estudiante", "department", "numero_documento", "proyecto_curricular", "telefono"],
    ejemplo: {
      email: "monitor@udistrital.edu.co",
      full_name: "Nombre completo del monitor",
      codigo_estudiante: "20201000000",
      department: "informatics_labs",
      numero_documento: "1000000000",
      proyecto_curricular: "ingenieria_sistemas",
      telefono: "3000000000",
    },
  },
  horarios: {
    nombre: "plantilla_carga_horarios.xlsx",
    hoja: "Horarios",
    columnas: ["email_monitor", "day", "start_time", "end_time", "location", "asignatura", "grupo", "docente", "proyecto_curricular"],
    ejemplo: {
      email_monitor: "monitor@udistrital.edu.co",
      day: "Lunes",
      start_time: "08:00:00",
      end_time: "12:00:00",
      location: "Aula 101",
      asignatura: "Programación",
      grupo: "01",
      docente: "Nombre del docente",
      proyecto_curricular: "ingenieria_sistemas",
    },
  },
};

export function descargarPlantillaCarga(tipo: Plantilla) {
  const plantilla = plantillas[tipo];
  const hoja = XLSX.utils.json_to_sheet([plantilla.ejemplo], { header: plantilla.columnas });
  hoja["!freeze"] = { xSplit: 0, ySplit: 1 };
  hoja["!cols"] = plantilla.columnas.map((columna) => ({ wch: Math.max(16, columna.length + 3) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, plantilla.hoja);
  XLSX.writeFile(libro, plantilla.nombre);
}
