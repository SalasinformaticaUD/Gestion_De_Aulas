import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "C:/Users/MONITORES/Documents/Software Monitorias/Frontend/public/plantillas/plantilla-carga-masiva-multas.xlsx";
const outputDir = "C:/Users/MONITORES/Documents/Software Monitorias/.tmp-fines-template-edit";
const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 6000,
  tableMaxRows: 10,
  tableMaxCols: 10,
});
console.log(summary.ndjson);

const preview = await workbook.render({
  sheetName: "Multas",
  range: "A1:G8",
  scale: 1.5,
  format: "png",
});
await fs.writeFile(`${outputDir}/before.png`, new Uint8Array(await preview.arrayBuffer()));
