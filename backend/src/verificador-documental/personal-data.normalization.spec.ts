import {
  normalizarDato,
  normalizarFecha,
  distanciaEdicion,
  nombreNormalizado,
} from './personal-data.normalization';
import type { CampoPersonal } from './personal-data.types';
const n = (campo: CampoPersonal, original: string) =>
  normalizarDato({ campo, original, pagina: 3, regla: 'prueba' });
describe('Normalización personal sin perder originales', () => {
  it.each<[CampoPersonal, string, string]>([
    ['nombreCompleto', '  Ana  María   Pérez-Gómez  ', 'ANA MARIA PEREZ GOMEZ'],
    ['primerApellido', 'Urueña', 'URUEÑA'],
    ['numeroIdentificacion', '001.234.567', '001234567'],
    ['numeroIdentificacion', ' ab-001 234 ', 'AB001234'],
    ['tipoIdentificacion', 'C.C.', 'CC'],
    ['tipoIdentificacion', 'cédula de extranjería', 'CE'],
    ['tipoIdentificacion', 'Tarjeta de Identidad', 'TI'],
    ['tipoIdentificacion', 'Pasaporte', 'PASAPORTE'],
    ['tipoIdentificacion', 'PPT', 'PPT'],
    ['tipoIdentificacion', 'PEP', 'PEP'],
    ['lugarExpedicion', 'Bogotá, D.C.', 'BOGOTA DC'],
    ['lugarExpedicion', 'BOGOTA DISTRITO CAPITAL', 'BOGOTA DC'],
    ['lugarNacimiento', 'Medellín', 'MEDELLIN'],
    ['nacionalidad', 'Colombiano', 'COLOMBIANA'],
    ['sexo', 'F', 'FEMENINO'],
    ['correo', 'Ana@Ejemplo.COM', 'ana@ejemplo.com'],
    ['telefono', '+57 (300) 123-4567', '+573001234567'],
  ])(
    '%s: normaliza %s sin cambiar el original',
    (campo, original, esperado) => {
      const value = n(campo, original);
      expect(value.normalizado).toBe(esperado);
      expect(value.original).toBe(original);
      expect(value.pagina).toBe(3);
    },
  );
  it('no confunde ñ/n, O/0 ni pierde ceros iniciales', () => {
    expect(nombreNormalizado('PEÑA')).not.toBe(nombreNormalizado('PENA'));
    expect(n('numeroIdentificacion', 'ABO123').normalizado).not.toBe(
      n('numeroIdentificacion', 'AB0123').normalizado,
    );
    expect(n('numeroIdentificacion', '00123').normalizado).not.toBe(
      n('numeroIdentificacion', '123').normalizado,
    );
  });
  it.each([
    '1990-03-14',
    '1990/3/14',
    '14/03/1990',
    '14.03.1990',
    '14 de marzo de 1990',
    '14 MARZO 1990',
  ])('normaliza fecha %s', (v) =>
    expect(normalizarFecha(v).valor).toBe('1990-03-14'),
  );
  it('respeta el formato explícito y detecta fechas ambiguas', () => {
    expect(normalizarFecha('05/06/1990').motivo).toBe('FORMATO_FECHA_AMBIGUO');
    expect(normalizarFecha('05/06/1990', 'DMY').valor).toBe('1990-06-05');
    expect(normalizarFecha('05/06/1990', 'MDY').valor).toBe('1990-05-06');
  });
  it.each(['31/02/2000', '1990-13-01', '29/02/1900', '01/01/90', 'sin fecha'])(
    'no inventa una fecha para %s',
    (v) => expect(normalizarFecha(v).valor).toBeNull(),
  );
  it('comprueba años bisiestos', () =>
    expect(normalizarFecha('29/02/2000').valor).toBe('2000-02-29'));
  it.each<[CampoPersonal, string]>([
    ['numeroIdentificacion', '12/345'],
    ['tipoIdentificacion', 'desconocido'],
    ['correo', 'sin arroba'],
    ['telefono', 'oficina central'],
    ['nombreCompleto', '___'],
  ])('marca %s no interpretable', (campo, v) =>
    expect(n(campo, v).normalizado).toBeNull(),
  );
  it('detecta inserción, eliminación y transposición sin autocorregir', () => {
    expect(distanciaEdicion('PEREZ', 'PERZE')).toBe(1);
    expect(distanciaEdicion('PEREZ', 'PERE')).toBe(1);
    expect(distanciaEdicion('PEREZ', 'PEREZZ')).toBe(1);
  });
});
