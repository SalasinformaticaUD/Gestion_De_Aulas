import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const input = await FileBlob.load('C:/Users/MONITORES/Downloads/plantilla-aulas-2026-3.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('Aulas');

sheet.getRange('A1:G1').values = [[
  'AULA DE SOFTWARE',
  'CAPACIDAD',
  'PROYECTO',
  'ANO',
  'MARCA Y MODELO',
  'CARACTERISTICA',
  'NECESITA RENOVACION',
]];
sheet.getRange('A2:A22').format.numberFormat = '@';
sheet.getRange('B2:B22').format.numberFormat = '0';
sheet.getRange('D2:D22').format.numberFormat = '0';
workbook.recalculate();

const verification = await workbook.inspect({
  kind: 'table', range: 'Aulas!A1:G22', include: 'values,formulas',
  tableMaxRows: 22, tableMaxCols: 7,
});
console.log(verification.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 50 }, summary: 'formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'Aulas', autoCrop: 'all', scale: 1, format: 'png' });
await fs.writeFile('C:/Users/MONITORES/Documents/Software Monitorias/outputs/aulas-template-2026-3/preview.png', new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save('C:/Users/MONITORES/Documents/Software Monitorias/outputs/aulas-template-2026-3/plantilla-aulas-importacion.xlsx');
