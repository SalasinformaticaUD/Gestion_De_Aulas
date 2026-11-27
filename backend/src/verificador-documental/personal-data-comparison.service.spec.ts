import { PersonalDataComparisonService } from './personal-data-comparison.service';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';
import type {
  CampoPersonal,
  DatoPersonal,
  DocumentoPersonal,
} from './personal-data.types';
const engine = new PersonalDataComparisonService();
const doc = (
  i: number,
  campo: CampoPersonal,
  original: string,
  extra: Partial<DatoPersonal> = {},
): DocumentoPersonal => ({
  documentoIndice: i,
  tipo: DOCUMENTOS_REQUERIDOS[i % DOCUMENTOS_REQUERIDOS.length].tipo,
  datos: [{ campo, original, pagina: i + 1, regla: 'prueba', ...extra }],
});
const campo = (docs: DocumentoPersonal[], c: CampoPersonal) =>
  engine.comparar(docs).campos.find((x) => x.campo === c)!;
describe('Comparación independiente entre documentos', () => {
  it('detecta el número minoritario del ejemplo cinco contra uno con documento y página', () => {
    const docs = Array.from({ length: 6 }, (_, i) =>
      doc(i, 'numeroIdentificacion', i === 5 ? '1023456798' : '1023456789'),
    );
    const r = engine.comparar(docs);
    const f = r.campos.find((c) => c.campo === 'numeroIdentificacion')!;
    expect(f.mayoritario).toEqual({
      valor: '1023456789',
      votos: 5,
      esMayoriaAbsoluta: true,
    });
    expect(
      r.hallazgos.filter((h) => h.campo === 'numeroIdentificacion'),
    ).toHaveLength(1);
    expect(r.hallazgos[0]).toMatchObject({
      documentoIndice: 5,
      pagina: 6,
      campo: 'numeroIdentificacion',
      valorEncontrado: '1023456798',
      valorReferencia: '1023456789',
      codigo: 'DIFERENCIA_NUMERICA',
      requiereRevisionManual: true,
    });
    expect(r.hallazgos[0].accionSugerida).toContain('no demuestra');
  });
  it('no cambia el consenso al cambiar el orden de entrada', () => {
    const docs = [
      doc(0, 'tipoIdentificacion', 'CC'),
      doc(1, 'tipoIdentificacion', 'CC'),
      doc(2, 'tipoIdentificacion', 'CE'),
    ];
    expect(campo(docs, 'tipoIdentificacion').mayoritario).toEqual(
      campo([...docs].reverse(), 'tipoIdentificacion').mayoritario,
    );
  });
  it('distingue igualdad exacta de igualdad después de normalización', () => {
    expect(
      campo(
        [
          doc(0, 'nombreCompleto', 'ANA PEREZ'),
          doc(1, 'nombreCompleto', 'ANA PEREZ'),
        ],
        'nombreCompleto',
      ).estado,
    ).toBe('COINCIDENCIA_EXACTA');
    expect(
      campo(
        [
          doc(0, 'nombreCompleto', 'Ana Pérez'),
          doc(1, 'nombreCompleto', 'ANA  PEREZ'),
        ],
        'nombreCompleto',
      ).estado,
    ).toBe('COINCIDENCIA_NORMALIZADA');
  });
  it('no deja que páginas repetidas o copias aumenten votos', () => {
    const a = doc(0, 'numeroIdentificacion', '1234');
    a.datos.push({ ...a.datos[0], pagina: 2 });
    const copia = { ...doc(3, 'numeroIdentificacion', '1234'), tipo: a.tipo };
    const f = campo(
      [a, copia, doc(1, 'numeroIdentificacion', '1235')],
      'numeroIdentificacion',
    );
    expect(f.fuentesIndependientes).toBe(2);
    expect(f.estado).toBe('EMPATE');
    expect(f.grupos.map((g) => g.votos)).toEqual([1, 1]);
  });
  it('excluye el tipo documental con contradicciones internas', () => {
    const a = doc(0, 'numeroIdentificacion', '1234');
    a.datos.push({ ...a.datos[0], pagina: 2, original: '1235' });
    const r = engine.comparar([
      a,
      doc(1, 'numeroIdentificacion', '1234'),
      doc(2, 'numeroIdentificacion', '1234'),
    ]);
    const f = r.campos.find((c) => c.campo === 'numeroIdentificacion')!;
    expect(f.tiposEnConflicto).toEqual(['PERSONERIA']);
    expect(f.mayoritario?.votos).toBe(2);
    expect(r.hallazgos[0]).toMatchObject({
      codigo: 'CONFLICTO_INTERNO_CAMPO',
      documentoIndice: 0,
    });
    expect(r.hallazgos[0].evidencia.paginas).toEqual([1, 2]);
  });
  it('excluye copias del mismo tipo que se contradicen', () => {
    const a = doc(0, 'numeroIdentificacion', '1234'),
      b = { ...doc(1, 'numeroIdentificacion', '1235'), tipo: 'PERSONERIA' };
    expect(campo([a, b], 'numeroIdentificacion').estado).toBe(
      'CONFLICTO_INTERNO',
    );
    expect(campo([a, b], 'numeroIdentificacion').fuentesIndependientes).toBe(0);
  });
  it('detecta empates sin establecer referencia', () => {
    const r = engine.comparar([
      doc(0, 'numeroIdentificacion', '11'),
      doc(1, 'numeroIdentificacion', '11'),
      doc(2, 'numeroIdentificacion', '22'),
      doc(3, 'numeroIdentificacion', '22'),
    ]);
    expect(
      r.campos.find((c) => c.campo === 'numeroIdentificacion'),
    ).toMatchObject({ estado: 'EMPATE', mayoritario: null });
    expect(r.hallazgos).toHaveLength(4);
    expect(
      r.hallazgos.every(
        (h) => h.codigo === 'EMPATE_EN_CAMPO' && !h.valorReferencia,
      ),
    ).toBe(true);
  });
  it('distingue la mayoría relativa de la absoluta', () => {
    const f = campo(
      ['11', '11', '11', '22', '22', '33', '33'].map((v, i) =>
        doc(i, 'numeroIdentificacion', v),
      ),
      'numeroIdentificacion',
    );
    expect(f.estado).toBe('MAYORIA_RELATIVA');
    expect(f.mayoritario).toEqual({
      valor: '11',
      votos: 3,
      esMayoriaAbsoluta: false,
    });
  });
  it('no usa una sola fuente ni los datos ingresados como verdad', () => {
    const r = engine.comparar([doc(0, 'numeroIdentificacion', '1234')], {
      numeroIdentificacion: '1234',
    });
    const f = r.campos.find((c) => c.campo === 'numeroIdentificacion')!;
    expect(f.estado).toBe('INFORMACION_INSUFICIENTE');
    expect(f.mayoritario).toBeNull();
    expect(f.fuentesIndependientes).toBe(1);
    expect(campo([], 'fechaNacimiento').estado).toBe('SIN_DATOS');
  });
  it('conserva los valores originales y no modifica los datos de entrada', () => {
    const docs = [
      doc(0, 'numeroIdentificacion', '001.234'),
      doc(1, 'numeroIdentificacion', '001234'),
    ];
    const antes = JSON.stringify(docs);
    const f = campo(docs, 'numeroIdentificacion');
    expect(JSON.stringify(docs)).toBe(antes);
    expect(f.grupos[0].observaciones.map((o) => o.original)).toEqual([
      '001.234',
      '001234',
    ]);
  });
  it.each<[CampoPersonal, string, string, string]>([
    ['primerNombre', 'ANA', 'ANNA', 'DIFERENCIA_ORTOGRAFICA'],
    ['segundoNombre', 'MARIA', 'MARAI', 'DIFERENCIA_ORTOGRAFICA'],
    ['primerApellido', 'PEREZ', 'PERZE', 'DIFERENCIA_ORTOGRAFICA'],
    ['segundoApellido', 'GOMEZ', 'GOMES', 'DIFERENCIA_ORTOGRAFICA'],
    ['tipoIdentificacion', 'CC', 'CE', 'DIFERENCIA_TIPO_IDENTIFICACION'],
    ['fechaNacimiento', '1990-03-14', '1991-03-14', 'DIFERENCIA_FECHA'],
    ['fechaExpedicion', '2010-03-14', '2011-03-14', 'DIFERENCIA_FECHA'],
    ['lugarExpedicion', 'BOGOTA', 'MEDELLIN', 'VALOR_PERSONAL_DIFERENTE'],
    ['nacionalidad', 'COLOMBIANA', 'PERUANA', 'VALOR_PERSONAL_DIFERENTE'],
    ['numeroIdentificacion', 'AB0123', 'ABO123', 'DIFERENCIA_IDENTIFICACION'],
  ])('señala diferencias en %s', (field, a, b, code) => {
    const r = engine.comparar([
      doc(0, field, a),
      doc(1, field, a),
      doc(2, field, b),
    ]);
    expect(r.hallazgos).toHaveLength(1);
    expect(r.hallazgos[0]).toMatchObject({
      campo: field,
      documentoIndice: 2,
      pagina: 3,
      codigo: code,
    });
  });
  it('compara formatos de fechas y lugares equivalentes', () => {
    expect(
      campo(
        [
          doc(0, 'fechaNacimiento', '1990-03-14'),
          doc(1, 'fechaNacimiento', '14 de marzo de 1990'),
        ],
        'fechaNacimiento',
      ).estado,
    ).toBe('COINCIDENCIA_NORMALIZADA');
    expect(
      campo(
        [
          doc(0, 'lugarExpedicion', 'Bogotá D.C.'),
          doc(1, 'lugarExpedicion', 'BOGOTA'),
        ],
        'lugarExpedicion',
      ).grupos,
    ).toHaveLength(1);
  });
  it('marca las fechas ambiguas sin inventar valores', () => {
    const r = engine.comparar([
      doc(0, 'fechaNacimiento', '05/06/1990'),
      doc(1, 'fechaNacimiento', '1990-06-05'),
    ]);
    const f = r.campos.find((c) => c.campo === 'fechaNacimiento')!;
    expect(f.noInterpretables[0].motivo).toBe('FORMATO_FECHA_AMBIGUO');
    expect(f.mayoritario).toBeNull();
    expect(r.hallazgos.some((h) => h.codigo === 'DATO_NO_INTERPRETABLE')).toBe(
      true,
    );
  });
  it('reconoce la presentación apellidos/nombres sin dividir nombres compuestos', () => {
    const f = campo(
      [
        doc(0, 'nombreCompleto', 'JUAN DE DIOS DE LA TORRE LOPEZ'),
        doc(1, 'nombreCompleto', 'DE LA TORRE LOPEZ JUAN DE DIOS', {
          ordenNombre: 'APELLIDOS_NOMBRES',
        }),
      ],
      'nombreCompleto',
    );
    expect(f.grupos).toHaveLength(1);
  });
  it('no reordena dos nombres de presentación natural sin evidencia', () => {
    expect(
      campo(
        [
          doc(0, 'nombreCompleto', 'ANA MARIA'),
          doc(1, 'nombreCompleto', 'MARIA ANA'),
        ],
        'nombreCompleto',
      ).estado,
    ).toBe('EMPATE');
  });
  it('marca el orden ambiguo del nombre en vez de escoger entre dos candidatos', () => {
    const f = campo(
      [
        doc(0, 'nombreCompleto', 'ANA MARIA PEREZ'),
        doc(1, 'nombreCompleto', 'MARIA PEREZ ANA'),
        doc(2, 'nombreCompleto', 'PEREZ ANA MARIA', {
          ordenNombre: 'APELLIDOS_NOMBRES',
        }),
      ],
      'nombreCompleto',
    );
    expect(f.noInterpretables[0].motivo).toBe('ORDEN_NOMBRE_AMBIGUO');
  });
  it('los datos ingresados no alteran la mayoría', () => {
    const r = engine.comparar(
      [
        doc(0, 'numeroIdentificacion', '11'),
        doc(1, 'numeroIdentificacion', '11'),
      ],
      { numeroIdentificacion: '22' },
    );
    expect(
      r.campos.find((c) => c.campo === 'numeroIdentificacion'),
    ).toMatchObject({
      mayoritario: { valor: '11', votos: 2 },
      referenciaIngresada: { original: '22', coincide: false },
    });
  });
  it('detecta una transposición ortográfica aunque la presentación sea apellidos/nombres', () => {
    const r = engine.comparar([
      doc(0, 'nombreCompleto', 'ANA MARIA PEREZ GOMEZ'),
      doc(1, 'nombreCompleto', 'ANA MARIA PEREZ GOMEZ'),
      doc(2, 'nombreCompleto', 'PERZE GOMEZ ANA MARIA', {
        ordenNombre: 'APELLIDOS_NOMBRES',
      }),
    ]);
    expect(r.hallazgos[0].codigo).toBe('DIFERENCIA_ORTOGRAFICA');
  });
  it.each<[CampoPersonal, string, string]>([
    ['sexo', 'F', 'FEMENINO'],
    ['correo', 'Ana@Example.TEST', 'ana@example.test'],
    ['telefono', '+57 (300) 123-4567', '+573001234567'],
    ['lugarNacimiento', 'Medellín', 'MEDELLIN'],
    ['nacionalidad', 'Colombia', 'Colombiana'],
  ])('compara el campo compartido %s', (c, a, b) => {
    const f = campo([doc(0, c, a), doc(1, c, b)], c);
    expect(f.grupos).toHaveLength(1);
    expect(f.estado).toBe('COINCIDENCIA_NORMALIZADA');
  });
});
