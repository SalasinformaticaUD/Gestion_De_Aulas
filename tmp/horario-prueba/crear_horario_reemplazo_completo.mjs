import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/tmp/horario-prueba";
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Horario");
const headers = [
  "AULA", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "GRUPO",
  "ASIGNATURA_CODIGO", "ASIGNATURA_NOMBRE", "DOCENTE_DOCUMENTO",
  "DOCENTE_NOMBRE", "DOCENTE_CORREO", "MODELO_PC", "SOFTWARE", "HARDWARE",
];
const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const bloques = [["06:00", "08:00"], ["08:00", "10:00"], ["10:00", "12:00"], ["14:00", "16:00"]];
const aulas = [
  ["306", "Dell OptiPlex 7090", "Visual Studio Code; Java; MySQL Workbench", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["312", "HP ProDesk 600", "AutoCAD; Blender; VS Code; Node.js", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
];
const rows = [];
let consecutivo = 1;
for (const [aula, modelo, software, hardware] of aulas) {
  for (let dia = 1; dia <= dias.length; dia += 1) {
    for (const [horaInicio, horaFin] of bloques) {
      const id = String(consecutivo).padStart(2, "0");
      rows.push([
        aula, dia, horaInicio, horaFin, `REEMPLAZO-${aula}-${id}`,
        `REP-${id}`, `${dias[dia - 1]} - Clase de verificación ${id}`,
        `9100${String(consecutivo).padStart(4, "0")}`, `Docente Reemplazo ${id}`,
        `docente.reemplazo${id}@universidad.edu.co`, modelo, software, hardware,
      ]);
      consecutivo += 1;
    }
  }
}
sheet.getRange(`A1:M${rows.length + 1}`).values = [headers, ...rows];
sheet.getRange("A1:M1").format = { fill: "#1F2937", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
sheet.getRange(`A2:M${rows.length + 1}`).format = { wrapText: true };
sheet.getRange(`A1:M${rows.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
sheet.getRange(`A1:M${rows.length + 1}`).format.autofitColumns();
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;
const preview = await workbook.render({ sheetName: "Horario", range: `A1:M${rows.length + 1}`, scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/horario_reemplazo_completo_preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/horario_reemplazo_completo.xlsx`);
