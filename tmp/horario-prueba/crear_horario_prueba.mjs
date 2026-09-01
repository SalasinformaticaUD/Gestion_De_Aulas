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
const rows = [
  ["306", 1, "06:00", "08:00", "CARGA-306-01", "MAT-201", "Programación avanzada", "90010001", "Docente Carga Uno", "docente.carga1@universidad.edu.co", "Dell OptiPlex 7090", "Visual Studio Code; Java", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["306", 1, "08:00", "10:00", "CARGA-306-02", "MAT-202", "Bases de datos", "90010002", "Docente Carga Dos", "docente.carga2@universidad.edu.co", "Dell OptiPlex 7090", "MySQL Workbench; PostgreSQL", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["306", 1, "10:00", "12:00", "CARGA-306-03", "MAT-203", "Redes de computadores", "90010003", "Docente Carga Tres", "docente.carga3@universidad.edu.co", "Dell OptiPlex 7090", "Cisco Packet Tracer; Wireshark", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["306", 1, "14:00", "16:00", "CARGA-306-04", "MAT-204", "Ingeniería de software", "90010004", "Docente Carga Cuatro", "docente.carga4@universidad.edu.co", "Dell OptiPlex 7090", "Visual Studio; Git", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["306", 2, "08:00", "10:00", "CARGA-306-05", "MAT-205", "Sistemas operativos", "90010005", "Docente Carga Cinco", "docente.carga5@universidad.edu.co", "Dell OptiPlex 7090", "VirtualBox; Ubuntu", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["306", 3, "10:00", "12:00", "CARGA-306-06", "MAT-206", "Arquitectura de computadores", "90010006", "Docente Carga Seis", "docente.carga6@universidad.edu.co", "Dell OptiPlex 7090", "Logisim; Arduino IDE", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["312", 1, "06:00", "08:00", "CARGA-312-01", "CAD-201", "Diseño asistido por computador", "90010007", "Docente Carga Siete", "docente.carga7@universidad.edu.co", "HP ProDesk 600", "AutoCAD; LibreOffice", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 1, "08:00", "10:00", "CARGA-312-02", "CAD-202", "Modelado 3D", "90010008", "Docente Carga Ocho", "docente.carga8@universidad.edu.co", "HP ProDesk 600", "Blender; AutoCAD", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 1, "10:00", "12:00", "CARGA-312-03", "WEB-201", "Desarrollo web", "90010009", "Docente Carga Nueve", "docente.carga9@universidad.edu.co", "HP ProDesk 600", "VS Code; Node.js", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 2, "14:00", "16:00", "CARGA-312-04", "WEB-202", "Aplicaciones web", "90010010", "Docente Carga Diez", "docente.carga10@universidad.edu.co", "HP ProDesk 600", "VS Code; Node.js; Git", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 4, "16:00", "18:00", "CARGA-312-05", "ELE-201", "Electrónica digital", "90010011", "Docente Carga Once", "docente.carga11@universidad.edu.co", "HP ProDesk 600", "Proteus; Arduino IDE", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["312", 5, "18:00", "20:00", "CARGA-312-06", "PRO-201", "Proyecto integrador", "90010012", "Docente Carga Doce", "docente.carga12@universidad.edu.co", "HP ProDesk 600", "Git; Docker; VS Code", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
];
sheet.getRange(`A1:M${rows.length + 1}`).values = [headers, ...rows];
sheet.getRange("A1:M1").format = { fill: "#1F2937", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
sheet.getRange(`A2:M${rows.length + 1}`).format = { wrapText: true };
sheet.getRange(`A1:M${rows.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
sheet.getRange("A1:M13").format.autofitColumns();
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;
const preview = await workbook.render({ sheetName: "Horario", range: "A1:M13", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/horario_prueba_mas_clases_preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/horario_prueba_mas_clases.xlsx`);
