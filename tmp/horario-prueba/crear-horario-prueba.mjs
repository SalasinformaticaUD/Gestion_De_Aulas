import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/tmp/horario-prueba";
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Horario");
sheet.showGridLines = false;

const headers = [
  "AULA", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "GRUPO", "SEMANA",
  "ASIGNATURA_CODIGO", "ASIGNATURA_NOMBRE", "DOCENTE_DOCUMENTO", "DOCENTE_NOMBRE",
  "DOCENTE_CORREO", "MODELO_PC", "SOFTWARE", "HARDWARE",
];
const data = [
  ["306", 1, "06:00", "08:00", "PRUEBA-01", 5, "MAT-PRUEBA", "Programación de prueba", "99900001", "Docente Prueba Uno", "docente.prueba1@universidad.edu.co", "Dell OptiPlex 7090", "Visual Studio Code; Java", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["312", 2, "10:00", "12:00", "PRUEBA-02", 5, "CAD-PRUEBA", "Diseño asistido de prueba", "99900002", "Docente Prueba Dos", "docente.prueba2@universidad.edu.co", "HP ProDesk 600", "AutoCAD; LibreOffice", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
];

sheet.getRange("A1:N1").values = [headers];
sheet.getRange("A2:N3").values = data;
sheet.getRange("A1:N1").format = {
  fill: "#B91C1C",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("A2:N3").format = {
  borders: { preset: "all", style: "thin", color: "#D1D5DB" },
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("B2:B3").format.numberFormat = "0";
sheet.getRange("F2:F3").format.numberFormat = "0";
sheet.getRange("B2:B500").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 6 } };
sheet.getRange("F2:F500").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 26 } };
sheet.getRange("A1:N3").format.rowHeight = 30;
const widths = [12, 13, 14, 12, 14, 10, 20, 32, 22, 28, 34, 24, 34, 42];
widths.forEach((width, index) => sheet.getRangeByIndexes(0, index, 3, 1).format.columnWidth = width);
sheet.freezePanes.freezeRows(1);
sheet.tables.add("A1:N3", true, "HorarioPrueba");

const notes = workbook.worksheets.add("Instrucciones");
notes.showGridLines = false;
notes.getRange("A1:B1").values = [["Plantilla de prueba - Carga masiva de horarios", ""]];
notes.mergeCells("A1:B1");
notes.getRange("A1:B1").format = { fill: "#B91C1C", font: { bold: true, color: "#FFFFFF", size: 14 }, horizontalAlignment: "center" };
notes.getRange("A3:B8").values = [
  ["Período sugerido", "2026-3 (activo)"],
  ["Semana de prueba", "5"],
  ["Filas incluidas", "2 clases de prueba"],
  ["Aulas usadas", "306 y 312"],
  ["Resultado esperado", "2 clases creadas, sin errores de formato"],
  ["Importante", "Subir desde el botón Importar Excel como administrador"],
];
notes.getRange("A3:A8").format = { fill: "#FEE2E2", font: { bold: true, color: "#7F1D1D" } };
notes.getRange("A3:B8").format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
notes.getRange("A1:B8").format.wrapText = true;
notes.getRange("A1:A8").format.columnWidth = 24;
notes.getRange("B1:B8").format.columnWidth = 70;
notes.freezePanes.freezeRows(2);

const preview = await workbook.render({ sheetName: "Horario", range: "A1:N3", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/horario_prueba_preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/horario_prueba_carga_masiva.xlsx`);
const check = await workbook.inspect({ kind: "table", sheetId: "Horario", range: "A1:N3", include: "values", tableMaxRows: 4, tableMaxCols: 14 });
console.log(check.ndjson);
