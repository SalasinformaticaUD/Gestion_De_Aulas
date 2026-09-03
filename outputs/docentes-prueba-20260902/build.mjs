import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/outputs/docentes-prueba-20260902";
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Docentes");
sheet.getRange("A1:C11").values = [
  ["ID", "NOMBRE", "PROYECTO"],
  ["1020304001", "María Fernanda Rojas", "Ingeniería de Sistemas"],
  ["1020304002", "Carlos Andrés Martínez", "Ingeniería Industrial"],
  ["1020304003", "Laura Camila Hernández", "Ingeniería Electrónica"],
  ["1020304004", "Jorge Eduardo Ramírez", "Tecnología en Sistematización de Datos"],
  ["1020304005", "Paola Andrea Sánchez", "Ingeniería Catastral y Geodesia"],
  ["1020304006", "Diego Alejandro Torres", "Administración Deportiva"],
  ["1020304007", "Natalia Isabel Gómez", "Licenciatura en Matemáticas"],
  ["1020304008", "Ricardo Felipe Vargas", "Ingeniería Ambiental"],
  ["1020304009", "Sandra Milena Castillo", "Diseño Gráfico"],
  ["1020304010", "Andrés Felipe Moreno", "Ingeniería de Telecomunicaciones"],
];
sheet.getRange("A1:C1").format = { fill: "#A51022", font: { name: "Aptos", size: 11, bold: true, color: "#FFFFFF" } };
sheet.getRange("A1:C11").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
sheet.getRange("A2:A11").format.numberFormat = "@";
sheet.getRange("A:A").format.columnWidth = 18;
sheet.getRange("B:B").format.columnWidth = 32;
sheet.getRange("C:C").format.columnWidth = 42;
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;
const check = await workbook.inspect({ kind: "table", sheetId: "Docentes", range: "A1:C11", include: "values", tableMaxRows: 12, tableMaxCols: 3 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Docentes", range: "A1:C11", scale: 1, format: "png" });
await fs.writeFile(outputDir + "/preview.png", new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputDir + "/docentes_prueba.xlsx");
