import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = 'outputs/horarios-prueba';
await fs.mkdir(outputDir, { recursive: true });
const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Horario');
sheet.showGridLines = false;

const rows = [
  ['Periodo', 'Dia', 'Hora', 'Cap', 'Salon', 'Grupo', 'Asignatura', 'Proyecto', 'id', 'Docente', 'Inscritos2'],
  ['2026-1', 'LUNES', '6AM', 20, 'AULA 306 CAP(20)', '025-63', '2 - PROGRAMACION BASICA', '5 - INGENIERIA ELECTRONICA', 'AULA 306 6AM LUNES', 'ROBERTO ALBEIRO PAVA DIAZ', 16],
  ['2026-1', 'LUNES', '8AM', 20, 'AULA 306 CAP(20)', '015-23', '132 - INGENIERIA DE METODOS Y TIEMPOS', '15 - INGENIERIA INDUSTRIAL', 'AULA 306 8AM LUNES', 'FLOR DE MARIA GUTIERREZ', 20],
  ['2026-1', 'LUNES', '10AM', 22, 'AULA 312 CAP(22)', '100-01', '700003020 - PROYECTO DE INVESTIGACION II', '700 - PROGRAMA DE INGENIERIA', 'AULA 312 10AM LUNES', 'HENRY ALBERTO DIOSA', 4],
  ['2026-1', 'MARTES', '2PM', 20, 'AULA 306 CAP(20)', '005-5', '8 - HISTORIA Y CULTURA COLOMBIANA', '5 - INGENIERIA ELECTRONICA', 'AULA 306 2PM MARTES', 'ALBERTO FRANCISCO RUANO MIRANDA', 34],
  ['2026-1', 'MIERCOLES', '4PM', 22, 'AULA 312 CAP(22)', '015-21', '174 - ESTRUCTURAMENTAL Y COMPORTAMIENTOS', '15 - INGENIERIA INDUSTRIAL', 'AULA 312 4PM MIERCOLES', 'HELVER RICARDO TOCASUCHE GONZALEZ', 29],
  ['2026-1', 'JUEVES', '6PM', 20, 'AULA 306 CAP(20)', '015-21', '182 - PROGRAMACION NO LINEAL', '15 - INGENIERIA INDUSTRIAL', 'AULA 306 6PM JUEVES', 'EDUIN RAMIRO LOPEZ SANTANA', 18],
  ['2026-1', 'VIERNES', '8AM', 22, 'AULA 312 CAP(22)', '025-63', '410 - PROGRAMACION AVANZADA', '25 - INGENIERIA DE SISTEMAS', 'AULA 312 8AM VIERNES', 'MARIA FERNANDA TORRES', 21],
];

sheet.getRange(`A1:K${rows.length}`).values = rows;
sheet.getRange('A1:K1').format = { fill: '#1B1D22', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center' };
sheet.getRange(`A2:K${rows.length}`).format = { borders: { preset: 'all', style: 'thin', color: '#D9E2EC' }, verticalAlignment: 'center' };
sheet.getRange(`D2:D${rows.length}`).format.numberFormat = '0';
sheet.getRange(`K2:K${rows.length}`).format.numberFormat = '0';
sheet.getRange(`A2:C${rows.length}`).format.horizontalAlignment = 'center';
sheet.getRange(`D2:D${rows.length}`).format.horizontalAlignment = 'right';
sheet.getRange(`K2:K${rows.length}`).format.horizontalAlignment = 'right';
sheet.getRange('A:K').format.wrapText = false;
const widths = [14, 14, 12, 9, 23, 12, 42, 38, 28, 38, 13];
widths.forEach((width, index) => sheet.getRangeByIndexes(0, index, rows.length, 1).format.columnWidth = width);
sheet.getRange('A1:K1').format.rowHeight = 26;
sheet.freezePanes.freezeRows(1);
sheet.getRange(`B2:B${rows.length}`).dataValidation = { rule: { type: 'list', values: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] } };

const check = await workbook.inspect({ kind: 'table', sheetId: 'Horario', range: `A1:K${rows.length}`, include: 'values', tableMaxRows: 12, tableMaxCols: 11, maxChars: 8000 });
console.log(check.ndjson);
const preview = await workbook.render({ sheetName: 'Horario', range: `A1:K${rows.length}`, scale: 1, format: 'png' });
await fs.writeFile(`${outputDir}/horarios-prueba.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(`${outputDir}/horarios-prueba-2026-1.xlsx`);
