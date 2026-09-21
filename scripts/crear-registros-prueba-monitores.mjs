import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = "C:\\Users\\ACER\\Documents\\Software Monitorias\\outputs\\registros-prueba-monitores-2026-3.xlsx";
const headers = [
  "Departamento", "Nro. de usuario", "ID de usuario", "Nombre", "Fecha/Hora",
  "Tipo de registro", "Operación", "Descripción de la excepción", "Turno",
  "Código de identificación", "Identificación", "Código de tarea", "Dispositivo Nro.", "Marcado",
];
// Excel no guarda zona horaria; se fija la hora de Colombia tal como debe leerla el importador.
const eventAt = (day, hour, minute) => new Date(Date.UTC(2026, 8, day, hour, minute, 0));
const base = (name, userNumber, userId, day, hour, minute, recordType) => [
  "Monitores Aulas de Software", userNumber, userId, name, eventAt(day, hour, minute),
  recordType, "Registro", "Registro de prueba", "", 1, "Huella", 0, 101, false,
];
const rows = [
  // Carol: tres retardos (14, 15 y 16 de septiembre) para generar memorando al tercer caso.
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 14, 8, 25, "Entrada"),
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 14, 12, 0, "Salida"),
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 15, 8, 30, "Entrada"),
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 15, 12, 0, "Salida"),
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 16, 8, 35, "Entrada"),
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 16, 12, 0, "Salida"),
  // Kaleth: jornada de 6 h 30 min frente a un horario de 4 h para horas extra pendientes.
  base("Kaleth Molina Diaz", 3102, 4102, 17, 8, 0, "Entrada"),
  base("Kaleth Molina Diaz", 3102, 4102, 17, 14, 30, "Salida"),
  // Esteban: sesión normal dentro del horario.
  base("Esteban Alexander Bautista Solano", 3103, 4103, 18, 8, 0, "Entrada"),
  base("Esteban Alexander Bautista Solano", 3103, 4103, 18, 12, 0, "Salida"),
  // Carol: pareja menor de 30 min para la bandeja de inconsistencias.
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 17, 14, 0, "Entrada"),
  base("Carol Stefanya Velasco Rodríguez", 3101, 4101, 17, 14, 15, "Salida"),
  // ghdfgh: marcación impar/sin salida.
  base("ghdfgh", 3104, 4104, 19, 9, 0, "Entrada"),
  // Persona no registrada: caso para conciliación manual.
  base("Monitor No Registrado Prueba", 3199, 4199, 18, 10, 0, "Entrada"),
  base("Monitor No Registrado Prueba", 3199, 4199, 18, 12, 0, "Salida"),
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Registros de prueba");
sheet.showGridLines = false;
sheet.getRange("A1:N16").values = [headers, ...rows];
sheet.getRange("A1:N1").format = {
  fill: "#8B1728",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("A2:N16").format = {
  font: { name: "Arial", size: 10, color: "#1F2937" },
  verticalAlignment: "center",
};
sheet.getRange("A1:N16").format.borders = { preset: "insideHorizontal", style: "thin", color: "#E5E7EB" };
sheet.getRange("E2:E16").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
sheet.getRange("A1:N16").format.autofitColumns();
sheet.getRange("A1").format.rowHeight = 34;
sheet.getRange("A:A").format.columnWidth = 28;
sheet.getRange("D:D").format.columnWidth = 34;
sheet.getRange("E:E").format.columnWidth = 21;
sheet.freezePanes.freezeRows(1);
sheet.tables.add("A1:N16", true, "RegistrosPrueba20263").style = "TableStyleMedium2";

workbook.recalculate();
await fs.mkdir("C:\\Users\\ACER\\Documents\\Software Monitorias\\outputs", { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
const preview = await workbook.render({ sheetName: "Registros de prueba", range: "A1:N16", scale: 1.4, format: "png" });
await fs.writeFile("C:\\Users\\ACER\\Documents\\Software Monitorias\\outputs\\registros-prueba-monitores-2026-3.png", new Uint8Array(await preview.arrayBuffer()));
console.log(outputPath);
