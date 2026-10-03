import * as XLSX from "xlsx";

type Plantilla = "monitores" | "horarios";

const ejemplos = [
  { email: "ejemplo.monitor1@udistrital.edu.co", nombre: "Ejemplo Monitor Uno", codigo: "20261000001", departamento: "informatics_labs", proyecto: "ingenieria_electronica", dia: "Lunes", inicio: "06:00:00", fin: "08:00:00", aula: "Aula 101", asignatura: "Circuitos" },
  { email: "ejemplo.monitor2@udistrital.edu.co", nombre: "Ejemplo Monitor Dos", codigo: "20261000002", departamento: "electrical", proyecto: "ingenieria_sistemas", dia: "Martes", inicio: "08:00:00", fin: "10:00:00", aula: "Aula 102", asignatura: "Programación" },
  { email: "ejemplo.monitor3@udistrital.edu.co", nombre: "Ejemplo Monitor Tres", codigo: "20261000003", departamento: "physics", proyecto: "ingenieria_electrica", dia: "Miércoles", inicio: "10:00:00", fin: "12:00:00", aula: "Aula 103", asignatura: "Máquinas eléctricas" },
  { email: "ejemplo.monitor4@udistrital.edu.co", nombre: "Ejemplo Monitor Cuatro", codigo: "20261000004", departamento: "informatics_labs", proyecto: "ingenieria_industrial", dia: "Jueves", inicio: "12:00:00", fin: "14:00:00", aula: "Aula 104", asignatura: "Procesos industriales" },
  { email: "ejemplo.monitor5@udistrital.edu.co", nombre: "Ejemplo Monitor Cinco", codigo: "20261000005", departamento: "electrical", proyecto: "ingenieria_catastral", dia: "Viernes", inicio: "14:00:00", fin: "16:00:00", aula: "Aula 105", asignatura: "Cartografía" },
  { email: "ejemplo.monitor6@udistrital.edu.co", nombre: "Ejemplo Monitor Seis", codigo: "20261000006", departamento: "physics", proyecto: "licenciatura_fisica", dia: "Sábado", inicio: "16:00:00", fin: "18:00:00", aula: "Aula 106", asignatura: "Física experimental" },
] as const;

const plantillas: Record<Plantilla, { nombre: string; hoja: string; columnas: string[]; filas: Array<Record<string, string>> }> = {
  monitores: {
    nombre: "plantilla_carga_monitores.xlsx",
    hoja: "Monitores",
    columnas: ["email", "full_name", "codigo_estudiante", "department", "numero_documento", "proyecto_curricular", "telefono"],
    filas: ejemplos.map((ejemplo, indice) => ({
      email: ejemplo.email,
      full_name: ejemplo.nombre,
      codigo_estudiante: ejemplo.codigo,
      department: ejemplo.departamento,
      numero_documento: `100000000${indice + 1}`,
      proyecto_curricular: ejemplo.proyecto,
      telefono: `300000000${indice + 1}`,
    })),
  },
  horarios: {
    nombre: "plantilla_carga_horarios.xlsx",
    hoja: "Horarios",
    columnas: ["email_monitor", "day", "start_time", "end_time", "location", "asignatura", "grupo", "docente", "proyecto_curricular"],
    filas: ejemplos.map((ejemplo) => ({
      email_monitor: ejemplo.email,
      day: ejemplo.dia,
      start_time: ejemplo.inicio,
      end_time: ejemplo.fin,
      location: ejemplo.aula,
      asignatura: ejemplo.asignatura,
      grupo: "01",
      docente: "Docente de ejemplo",
      proyecto_curricular: ejemplo.proyecto,
    })),
  },
};

export function descargarPlantillaCarga(tipo: Plantilla) {
  const plantilla = plantillas[tipo];
  const hoja = XLSX.utils.json_to_sheet(plantilla.filas, { header: plantilla.columnas });
  hoja["!freeze"] = { xSplit: 0, ySplit: 1 };
  hoja["!cols"] = plantilla.columnas.map((columna) => ({
    wch: Math.min(40, Math.max(16, columna.length + 3, ...plantilla.filas.map((fila) => fila[columna].length + 2))),
  }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, plantilla.hoja);
  XLSX.writeFile(libro, plantilla.nombre);
}
