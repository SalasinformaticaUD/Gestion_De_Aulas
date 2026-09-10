import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const base = 'C:/Users/MONITORES/Documents/Software Monitorias';
const source = JSON.parse(await fs.readFile(`${base}/.tmp-fines-template-edit/students-test.json`, 'utf8'));
if (source.students.length < 20 || !source.reason) throw new Error('Faltan datos reales');
const wb = Workbook.create();
const sheet = wb.worksheets.add('Multas');
const students = source.students.slice(10, 20);
if (students.length !== 10) throw new Error('No hay diez estudiantes adicionales para la segunda prueba');
const rows = students.map((s, i) => [
  `${s.codigo} - ${s.nombre}`, source.reason, '2026-09-10',
  `PRUEBA DE IMPORTACIÓN 20260910-B${String(i + 1).padStart(2, '0')}. Registro de prueba, no corresponde a una infracción real.`,
  'No aplica: prueba de importación.', 'ANULADA',
]);
sheet.getRange('A1:F11').values = [['Estudiante', 'Motivo', 'Fecha', 'Descripción', 'Multa sugerida', 'Estado'], ...rows];
sheet.showGridLines = false;
sheet.getRange('A1:F11').format.font = { name: 'Arial', size: 11, color: '#1F2937' };
sheet.getRange('A1:F11').format.wrapText = true;
sheet.getRange('A1:F11').format.verticalAlignment = 'center';
sheet.getRange('A1:F1').format.fill = '#B5122B';
sheet.getRange('A1:F1').format.font = { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' };
sheet.getRange('A1:F1').format.rowHeight = 28;
sheet.getRange('A2:F11').format.rowHeight = 62;
for (const [col, width] of [['A', 45], ['B', 28], ['C', 15], ['D', 60], ['E', 30], ['F', 15]]) sheet.getRange(`${col}:${col}`).format.columnWidth = width;
sheet.freezePanes.freezeRows(1);
sheet.getRange('F2:F11').dataValidation = { rule: { type: 'list', values: ['ACTIVA', 'CUMPLIDA', 'ANULADA'] } };
wb.recalculate();
console.log((await wb.inspect({kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!', options: {useRegex: true, maxResults: 10}})).ndjson);
const dir = `${base}/outputs/multas-prueba-20260910`;
await fs.mkdir(dir, {recursive: true});
const preview = await wb.render({sheetName: 'Multas', range: 'A1:F4', scale: 1, format: 'png'});
await fs.writeFile(`${base}/.tmp-fines-template-edit/test-preview.png`, new Uint8Array(await preview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(`${dir}/multas-prueba-estudiantes-existentes-2.xlsx`);
console.log('Generadas 10 filas ANULADA con códigos y nombres consultados en la base local Aulas.');
