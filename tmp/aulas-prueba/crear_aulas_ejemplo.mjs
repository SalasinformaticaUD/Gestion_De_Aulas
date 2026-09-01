import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Aulas");
const headers = ["CODIGO", "UBICACION", "CAPACIDAD", "MARCA", "MODELO_PC", "SOFTWARE", "HARDWARE"];
const rows = [
  ["AULA-PRUEBA-901", "Edificio Sabio Caldas", 30, "Dell", "OptiPlex 7090", "Visual Studio Code; Java; MySQL Workbench", "Intel Core i7; RAM 16 GB; SSD 512 GB"],
  ["AULA-PRUEBA-902", "Edificio Sabio Caldas", 25, "HP", "ProDesk 600 G6", "AutoCAD; Blender; LibreOffice", "Intel Core i5; RAM 8 GB; SSD 256 GB"],
  ["AULA-PRUEBA-903", "Edificio Ingeniería", 40, "Lenovo", "ThinkCentre M90q", "VS Code; Node.js; Git; Docker", "Intel Core i7; RAM 16 GB; SSD 1 TB"],
  ["AULA-PRUEBA-904", "Edificio Ingeniería", 20, "Dell", "Precision 3660", "MATLAB; Proteus; Arduino IDE", "Intel Core i7; RAM 32 GB; SSD 1 TB"],
  ["AULA-PRUEBA-905", "Edificio Laboratorios", 35, "Acer", "Veriton X5", "Python; RStudio; PostgreSQL", "Intel Core i5; RAM 16 GB; SSD 512 GB"],
];
sheet.getRange("A1:G6").values = [headers, ...rows];
sheet.getRange("A1:G1").format = { fill: "#1F2937", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
sheet.getRange("A2:G6").format = { wrapText: true };
sheet.getRange("A1:G6").format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
sheet.getRange("A1:G6").format.autofitColumns();
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save("C:/Users/MONITORES/Documents/Software Monitorias/tmp/aulas-prueba/aulas_ejemplo_carga_masiva.xlsx");
