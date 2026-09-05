import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Aulas");
const datos = [
  ["Aula de software", "Capacidad", "Proyecto", "Año", "Marca y modelo", "Caracteristica", "Necesita Renovación"],
  ["AULA-NUEVA-911", 30, "Ingeniería de Sistemas", 2024, "Dell OptiPlex 7090", "Sala de cómputo de propósito general", "No"],
  ["AULA-NUEVA-912", 25, "Ingeniería Industrial", 2023, "HP ProDesk 600 G6", "Sala con proyección y red cableada", "Sí"],
  ["AULA-NUEVA-913", 40, "Ingeniería Electrónica", 2022, "Lenovo ThinkCentre M90q", "Sala especializada para prácticas", "No"],
];
sheet.getRange("A1:G4").values = datos;
sheet.getRange("A1:G1").format = { fill: "#1F2937", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
sheet.getRange("A2:G4").format = { wrapText: true };
sheet.getRange("A1:G4").format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
sheet.getRange("A1:G4").format.autofitColumns();
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save("C:/Users/MONITORES/Documents/Software Monitorias/tmp/aulas-prueba/aulas_formato_actual.xlsx");
