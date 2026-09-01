import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/tmp/horario-prueba";
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Horario");
sheet.showGridLines = false;

const headers = ["AULA", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "GRUPO", "SEMANA", "ASIGNATURA_CODIGO", "ASIGNATURA_NOMBRE", "DOCENTE_DOCUMENTO", "DOCENTE_NOMBRE", "DOCENTE_CORREO", "MODELO_PC", "SOFTWARE", "HARDWARE"];
const rows = [
  ["306", 1, "06:00", "08:00", "General", 1, "prueba", "prof", "0101000", "pruebaa", "", "", "", ""],
  ["306", 1, "18:00", "20:00", "General", 1, "fis-20", "Ing Software", "123456789", "Salazar", "", "", "", ""],
  ["306", 1, "20:00", "22:00", "General", 1, "20", "test", "1231312321", "lu", "", "", "", ""],
  ["306", 6, "16:00", "18:00", "General", 1, "pru7eba", "progg", "12122", "prueba", "", "", "", ""],
  ["306", 1, "06:00", "08:00", "PRUEBA-01", 5, "MAT-PRUEBA", "Programación de prueba", "99900001", "Docente Prueba Uno", "docente.prueba1@universidad.edu.co", "Dell OptiPlex 7090", "Visual Studio Code; Java", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["312", 2, "10:00", "12:00", "PRUEBA-02", 5, "CAD-PRUEBA", "Diseño asistido de prueba", "99900002", "Docente Prueba Dos", "docente.prueba2@universidad.edu.co", "HP ProDesk 600", "AutoCAD; LibreOffice", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 2, "10:00", "12:00", "PRUEBA-312-01", 6, "CAD-PRUEBA", "Diseño asistido de prueba", "99900003", "Docente Aula 312", "docente.312@universidad.edu.co", "HP ProDesk 600", "AutoCAD; LibreOffice", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 5, "14:00", "16:00", "PRUEBA-312-02", 6, "WEB-PRUEBA", "Desarrollo web de prueba", "99900004", "Docente Recursos", "docente.recursos@universidad.edu.co", "Dell OptiPlex 7090", "VS Code; Node.js", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
];

sheet.getRange("A1:N1").values = [headers];
sheet.getRange("A2:N9").values = rows;
sheet.getRange("A1:N1").format = { fill: "#B91C1C", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
sheet.getRange("A2:N9").format = { borders: { preset: "all", style: "thin", color: "#D1D5DB" }, verticalAlignment: "center", wrapText: true };
sheet.getRange("B2:B500").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 6 } };
sheet.getRange("F2:F500").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 26 } };
const widths = [12, 13, 14, 12, 18, 10, 20, 32, 22, 28, 34, 24, 34, 42];
widths.forEach((width, index) => sheet.getRangeByIndexes(0, index, 9, 1).format.columnWidth = width);
sheet.freezePanes.freezeRows(1);
sheet.tables.add("A1:N9", true, "HorarioPruebaReemplazo");

const notes = workbook.worksheets.add("Instrucciones");
notes.showGridLines = false;
notes.getRange("A1:B1").values = [["Prueba de carga masiva con reemplazo seguro", ""]];
notes.mergeCells("A1:B1");
notes.getRange("A1:B1").format = { fill: "#B91C1C", font: { bold: true, color: "#FFFFFF", size: 14 }, horizontalAlignment: "center" };
notes.getRange("A3:B8").values = [["Período", "2026-3 (activo)"], ["Aulas", "306 y 312 (registradas)"], ["Clases incluidas", "6 actuales + 2 nuevas en aula 312"], ["Semanas", "Semanas 1, 5 y 6"], ["Resultado esperado", "8 creadas/actualizadas, 0 rechazadas y 0 eliminadas"], ["Carga", "Importar como administrador con reemplazo activado"]];
notes.getRange("A3:A8").format = { fill: "#FEE2E2", font: { bold: true, color: "#7F1D1D" } };
notes.getRange("A3:B8").format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
notes.getRange("A1:B8").format.wrapText = true;
notes.getRange("A1:A8").format.columnWidth = 24;
notes.getRange("B1:B8").format.columnWidth = 70;

const preview = await workbook.render({ sheetName: "Horario", range: "A1:N9", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/horario_prueba_reemplazo_preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/horario_prueba_reemplazo.xlsx`);
console.log("Archivo creado: horario_prueba_reemplazo.xlsx");
