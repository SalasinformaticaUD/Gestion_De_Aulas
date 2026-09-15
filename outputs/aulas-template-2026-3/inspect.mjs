import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const input = await FileBlob.load('C:/Users/MONITORES/Downloads/plantilla-aulas-2026-3.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const summary = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 6000,
  tableMaxRows: 20,
  tableMaxCols: 20,
});
console.log(summary.ndjson);
for (const sheet of workbook.worksheets.items) {
  const preview = await workbook.render({ sheetName: sheet.name, autoCrop: 'all', scale: 1, format: 'png' });
  const bytes = new Uint8Array(await preview.arrayBuffer());
  await (await import('node:fs/promises')).writeFile(`C:/Users/MONITORES/Documents/Software Monitorias/outputs/aulas-template-2026-3/${sheet.name}.png`, bytes);
}
