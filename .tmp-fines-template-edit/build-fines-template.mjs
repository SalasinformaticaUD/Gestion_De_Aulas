import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/outputs/fines-template";
const publicTemplate = "C:/Users/MONITORES/Documents/Software Monitorias/Frontend/public/plantillas/plantilla-carga-masiva-multas.xlsx";
const outputTemplate = `${outputDir}/plantilla-carga-masiva-multas.xlsx`;
const font = "Arial";
const red = "#B5122B";
const grid = "#D6DAE1";
const dark = "#1F2937";

const workbook = Workbook.create();
const multas = workbook.worksheets.add("Multas");
const instrucciones = workbook.worksheets.add("Instrucciones");

multas.showGridLines = false;
multas.getRange("A1:F2").values = [
  ["Estudiante", "Motivo", "Fecha", "Descripción", "Multa sugerida", "Estado"],
  [
    "20261001 - NOMBRE COMPLETO DEL ESTUDIANTE",
    "Incumplimiento de la devolución",
    new Date("2026-09-09T00:00:00"),
    "Describa brevemente la situación que originó la multa.",
    "Indique el compromiso o acción sugerida.",
    "ACTIVA",
  ],
];
multas.getRange("A1:F1").format = {
  fill: red,
  font: { name: font, size: 11, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: "#FFFFFF" },
};
multas.getRange("A2:F2").format = {
  font: { name: font, size: 10, color: dark },
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: grid },
};
multas.getRange("C2").format.numberFormat = "yyyy-mm-dd";
multas.getRange("A1:F1").format.rowHeight = 24;
multas.getRange("A2:F2").format.rowHeight = 48;
multas.getRange("A:A").format.columnWidth = 38;
multas.getRange("B:B").format.columnWidth = 31;
multas.getRange("C:C").format.columnWidth = 16;
multas.getRange("D:D").format.columnWidth = 46;
multas.getRange("E:E").format.columnWidth = 36;
multas.getRange("F:F").format.columnWidth = 15;
multas.tables.add("A1:F2", true, "PlantillaMultas");
multas.freezePanes.freezeRows(1);
multas.getRange("F2:F5001").dataValidation = {
  rule: { type: "list", values: ["ACTIVA", "CUMPLIDA", "ANULADA"] },
};

instrucciones.showGridLines = false;
instrucciones.getRange("A1:C9").values = [
  ["Carga masiva de multas", null, null],
  [null, null, null],
  ["Campo", "Formato", "Ejemplo"],
  [
    "Estudiante",
    "Obligatorio. Debe iniciar con el código numérico, seguido de un guion y el nombre.",
    "20261001 - NOMBRE COMPLETO DEL ESTUDIANTE",
  ],
  [
    "Motivo",
    "Obligatorio. Se crea o reutiliza automáticamente según el nombre.",
    "Incumplimiento de la devolución",
  ],
  ["Fecha", "Obligatoria. Use el formato AAAA-MM-DD.", "2026-09-09"],
  [
    "Descripción",
    "Obligatoria. Explique brevemente la situación.",
    "No realizó la devolución en el horario acordado.",
  ],
  [
    "Multa sugerida",
    "Opcional. Registre el compromiso o acción sugerida.",
    "Devolver los elementos pendientes.",
  ],
  ["Estado", "Obligatorio. Solo se acepta ACTIVA, CUMPLIDA o ANULADA.", "ACTIVA"],
];
instrucciones.mergeCells("A1:C1");
instrucciones.getRange("A1").format = {
  fill: red,
  font: { name: font, size: 14, bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
};
instrucciones.getRange("A1:C1").format.rowHeight = 28;
instrucciones.getRange("A3:C3").format = {
  fill: "#F4D6DC",
  font: { name: font, size: 10, bold: true, color: dark },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: grid },
};
instrucciones.getRange("A4:C9").format = {
  font: { name: font, size: 10, color: dark },
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: grid },
};
instrucciones.getRange("A4:A9").format.font = { name: font, size: 10, bold: true, color: dark };
instrucciones.getRange("A:A").format.columnWidth = 19;
instrucciones.getRange("B:B").format.columnWidth = 68;
instrucciones.getRange("C:C").format.columnWidth = 46;
instrucciones.getRange("A3:C3").format.rowHeight = 22;
instrucciones.getRange("A4:C9").format.rowHeight = 36;
instrucciones.tables.add("A3:C9", true, "InstruccionesMultas");

workbook.recalculate();

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 6000,
  tableMaxRows: 10,
  tableMaxCols: 8,
});
console.log(summary.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Multas",
  range: "A1:F8",
  scale: 1.5,
  format: "png",
});
await fs.writeFile(
  "C:/Users/MONITORES/Documents/Software Monitorias/.tmp-fines-template-edit/after.png",
  new Uint8Array(await preview.arrayBuffer()),
);

await fs.mkdir(outputDir, { recursive: true });
const file = await SpreadsheetFile.exportXlsx(workbook);
await file.save(outputTemplate);
await file.save(publicTemplate);
