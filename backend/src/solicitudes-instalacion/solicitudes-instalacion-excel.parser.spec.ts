import * as XLSX from 'xlsx';
import {
  clasificarHistorial,
  esCeldaVerde,
  extraerAulas,
  leerSolicitudesExcel,
  separarSoftware,
} from './solicitudes-instalacion-excel.parser';

const encabezados = [
  'Id',
  'Hora de inicio',
  'Hora de finalización',
  'Correo electrónico',
  'Nombre',
  'Language',
  'Nombre completo del docente:',
  'Correo electrónico institucional del docente:',
  'Seleccione el Proyecto curricular:',
  'Indique en cuáles aulas de software requiere el programa',
  'Indique el nombre de la asignatura que requieren el software solicitado',
  'Especificar la sala o salas de informática en las que debe realizarse la instalación del software.',
  'Indique el nombre del software o los programas y la versión requerida para su instalación:',
  '¿Desea ingresar una solicitud de software adicional para otra asignatura?',
  'Indique el nombre de la asignatura que requieren el software solicitado1',
  'Indique el nombre del software o los programas y la versión requerida para su instalación:1',
  'Observaciones para la instalación1',
  '¿Desea ingresar una solicitud de software adicional para otra asignatura?1',
  'Indique el nombre de la asignatura que requieren el software solicitado2',
  'Indique el nombre del software o los programas y la versión requerida para su instalación:2',
  'Observaciones para la instalación2',
  '¿Desea ingresar una solicitud de software adicional para otra asignatura?2',
  'Indique el nombre de la asignatura que requieren el software solicitado3',
  'Indique el nombre del software o los programas y la versión requerida para su instalación:3',
  'Observaciones para la instalación3',
  '¿Desea ingresar una solicitud de software adicional para otra asignatura?3',
  'Indique el nombre de la asignatura que requieren el software solicitado4',
  'Indique el nombre del software o los programas y la versión requerida para su instalación:4',
  'Observaciones para la instalación4',
  '¿Desea ingresar una solicitud de software adicional para otra asignatura?4',
  'Observaciones para la instalación',
];

function crearExcel(filas: unknown[][]): Buffer {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.aoa_to_sheet([encabezados, ...filas]),
    'Sheet1',
  );
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('lector de solicitudes de instalación', () => {
  it('convierte cinco bloques y separa programas sin romper comas entre paréntesis', () => {
    const fila = Array(31).fill('');
    fila[0] = 254;
    fila[1] = new Date('2026-07-26T10:00:00Z');
    fila[2] = new Date('2026-07-26T10:05:00Z');
    fila[6] = 'Docente Ejemplo';
    fila[7] = 'docente@udistrital.edu.co';
    fila[8] = 'Ingeniería de Sistemas';
    fila[9] = 'Aula 505, Aula 506';
    fila[10] = 'Ingeniería de software';
    fila[12] = 'Enterprise Architect\nDia Diagram Editor';
    fila[13] = 'Sí';
    fila[14] = 'Gestión de información';
    fila[15] = 'QGIS 3.6, QGIS 4.0';
    fila[17] = 'Sí';
    fila[18] = 'Interfaces';
    fila[19] = 'Anaconda (Jupyter, Spyder)';
    fila[21] = 'Sí';
    fila[22] = 'Lenguajes';
    fila[23] = 'Notepad++; Visual Studio Code';
    fila[25] = 'Sí';
    fila[26] = 'Big Data';
    fila[27] = 'VirtualBox';

    const resultado = leerSolicitudesExcel(crearExcel([fila]));

    expect(resultado.errores).toEqual([]);
    expect(resultado.solicitudes).toHaveLength(1);
    expect(resultado.solicitudes[0].items).toHaveLength(5);
    expect(resultado.solicitudes[0].items[0].software).toHaveLength(2);
    expect(resultado.solicitudes[0].items[2].software[0].nombreOriginal).toBe(
      'Anaconda (Jupyter, Spyder)',
    );
    expect(resultado.solicitudes[0].items[4].aulasOriginales).toEqual([
      '505',
      '506',
    ]);
    expect(resultado.solicitudes[0].consentimientoDatos).toBe(true);
    expect(resultado.solicitudes[0].proyectoCurricularOriginal).toBe(
      'INGENIERÍA DE SISTEMAS',
    );
  });

  it('separa listas por comas, saltos de línea y punto y coma', () => {
    expect(
      separarSoftware('Powerworld 23, NEPLAN 360\nMATLAB; ArcGIS'),
    ).toEqual(['Powerworld 23', 'NEPLAN 360', 'MATLAB', 'ArcGIS']);
  });

  it('extrae como aulas todas las secuencias independientes de tres dígitos', () => {
    expect(
      extraerAulas('Salas 405, laboratorio 506 y aula 405; edificio 1234'),
    ).toEqual(['405', '506']);
  });

  it('rechaza una estructura distinta a la del formulario', () => {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.aoa_to_sheet([['Otro encabezado'], ['dato']]),
      'Hoja',
    );
    const buffer = XLSX.write(libro, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    expect(() => leerSolicitudesExcel(buffer)).toThrow('estructura del Excel');
  });

  it('conserva una fila incompleta para revisión cuando tiene software', () => {
    const fila = Array(31).fill('');
    fila[0] = 'incompleta-1';
    fila[2] = new Date('2026-09-01T10:05:00Z');
    fila[12] = 'RStudio';

    const resultado = leerSolicitudesExcel(crearExcel([fila]));

    expect(resultado.errores).toEqual([]);
    expect(resultado.solicitudes).toHaveLength(1);
    expect(resultado.solicitudes[0].alertas).toEqual(
      expect.arrayContaining([
        'Falta el nombre del docente.',
        'Falta el correo institucional del docente.',
        'Falta el proyecto curricular.',
        'No se especificaron aulas para la instalación.',
      ]),
    );
  });

  it('clasifica como histórica una petición anterior al 15 de julio de 2026', () => {
    expect(
      clasificarHistorial(new Date('2026-07-14T23:59:59.999Z'), false),
    ).toEqual({ historica: true, motivo: 'FECHA_ANTERIOR_CORTE' });
  });

  it('desde el 15 de julio usa el verde del software para clasificar', () => {
    const fechaCorte = new Date('2026-07-15T00:00:00.000Z');
    expect(clasificarHistorial(fechaCorte, true)).toEqual({
      historica: true,
      motivo: 'SOFTWARE_MARCADO_VERDE',
    });
    expect(clasificarHistorial(fechaCorte, false)).toEqual({
      historica: false,
      motivo: null,
    });
  });

  it('reconoce los verdes del archivo y descarta otros colores', () => {
    const celda = (rgb: string) =>
      ({ s: { fgColor: { rgb } } }) as unknown as XLSX.CellObject;

    expect(esCeldaVerde(celda('92D050'))).toBe(true);
    expect(esCeldaVerde(celda('00B050'))).toBe(true);
    expect(esCeldaVerde(celda('70AD47'))).toBe(true);
    expect(esCeldaVerde(celda('A9D18E'))).toBe(true);
    expect(esCeldaVerde(celda('FF0000'))).toBe(false);
    expect(esCeldaVerde(celda('FBE5D6'))).toBe(false);
    expect(esCeldaVerde(undefined)).toBe(false);
  });
});
