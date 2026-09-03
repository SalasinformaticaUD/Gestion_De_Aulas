import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/outputs/estudiantes-prueba-20260902";
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Estudiantes");
const rows = [
  ["Código", "Nombre", "Correo"],
  ["2026101001", "Ana María Rodríguez", "ana.rodriguez@universidad.edu.co"],
  ["2026101002", "Juan David Martínez", "juan.martinez@universidad.edu.co"],
  ["2026101003", "Laura Valentina Gómez", "laura.gomez@universidad.edu.co"],
  ["2026101004", "Carlos Andrés Pérez", "carlos.perez@universidad.edu.co"],
  ["2026101005", "Sofía Natalia Torres", "sofia.torres@universidad.edu.co"],
  ["2026101006", "Miguel Ángel Herrera", "miguel.herrera@universidad.edu.co"],
  ["2026101007", "Daniela Fernanda López", "daniela.lopez@universidad.edu.co"],
  ["2026101008", "Nicolás Esteban Castro", "nicolas.castro@universidad.edu.co"],
  ["2026101009", "Mariana Isabel Rojas", "mariana.rojas@universidad.edu.co"],
  ["2026101010", "Felipe Santiago Vargas", "felipe.vargas@universidad.edu.co"],
];
sheet.getRange("A1:C11").values = rows;
sheet.getRange("A1:C1").format = { fill: "#A51022", font: { bold: true, color: "#FFFFFF" } };
sheet.getRange("A1:C11").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
sheet.getRange("A1:C11").format.font = { name: "Aptos", size: 11 };
sheet.getRange("A1:C1").format.font = { name: "Aptos", size: 11, bold: true, color: "#FFFFFF" };
sheet.getRange("A:A").format.columnWidth = 18;
sheet.getRange("B:B").format.columnWidth = 32;
sheet.getRange("C:C").format.columnWidth = 38;
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;
const inspect = await workbook.inspect({ kind: "table", sheetId: "Estudiantes", range: "A1:C11", include: "values", tableMaxRows: 12, tableMaxCols: 3 });
console.log(inspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Estudiantes", range: "A1:C11", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/plantilla_estudiantes_prueba.xlsx`);
