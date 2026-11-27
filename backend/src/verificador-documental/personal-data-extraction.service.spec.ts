import { PersonalDataExtractionService } from './personal-data-extraction.service';
import type { DocumentoClasificado } from './document-classification.service';
const extractor = new PersonalDataExtractionService();
const documento = (
  texto: string,
  tipo: DocumentoClasificado['tipo'] = 'DECLARACION_VERACIDAD',
  pagina = 7,
): DocumentoClasificado => ({
  archivoIndice: 0,
  tipo,
  paginaInicio: pagina,
  paginaFin: pagina,
  textoExtraido: texto,
  paginasTexto: [{ pagina, texto }],
  requiereOcr: false,
  estadoClasificacion: 'IDENTIFICADO',
  puntajeClasificacion: 8,
  evidenciasClasificacion: { senales: [], candidatos: [], porContexto: false },
  requiereRevisionManual: false,
});
describe('Extracción personal con procedencia', () => {
  it.each([
    'Cédula de Ciudadanía No. 001.234.567',
    'CC 001234567',
    'C.E. número AB1234',
    'Pasaporte No. AB01234',
    'PPT 12345',
  ])('extrae el identificador del titular en %s', (texto) => {
    const datos = extractor.extraer(documento(texto));
    expect(datos.some((d) => d.campo === 'numeroIdentificacion')).toBe(true);
    expect(datos.some((d) => d.campo === 'tipoIdentificacion')).toBe(true);
    expect(datos.every((d) => d.pagina === 7)).toBe(true);
  });
  it('extrae identidad de Personería sin confundir el autor con el titular', () => {
    const datos = extractor.extraer(
      documento(
        'el señor(a) ANA MARIA PEREZ GOMEZ, quien se identifica con\nCÉDULA DE CIUDADANÍA No. 1234567 de BOGOTA D.C.\nFuncionario: PEDRO LOPEZ',
        'PERSONERIA',
      ),
    );
    expect(
      datos.find((d) => d.campo === 'nombreCompleto')?.original.trim(),
    ).toBe('ANA MARIA PEREZ GOMEZ');
    expect(datos.find((d) => d.campo === 'lugarExpedicion')?.original).toBe(
      'BOGOTA D.C.',
    );
    expect(datos.some((d) => d.original.includes('PEDRO'))).toBe(false);
  });
  it('extrae la declaración y la presentación de la Policía', () => {
    expect(
      extractor
        .extraer(
          documento(
            'Yo, Ana Maria Perez Gomez, identificado (a) con la Cédula de Ciudadanía No. 1234 de Bogotá D.C., manifiesto',
          ),
        )
        .find((d) => d.campo === 'nombreCompleto')?.ordenNombre,
    ).toBe('NOMBRES_APELLIDOS');
    expect(
      extractor
        .extraer(
          documento(
            'Apellidos y Nombres: PEREZ GOMEZ ANA MARIA\nNO TIENE ASUNTOS',
            'POLICIA_JUDICIAL',
          ),
        )
        .find((d) => d.campo === 'nombreCompleto')?.ordenNombre,
    ).toBe('APELLIDOS_NOMBRES');
  });
  it('extrae la identificación de Contraloría y REDAM sin códigos de verificación ni NIT', () => {
    const contr = extractor.extraer(
      documento(
        'Tipo Documento Cédula de Ciudadanía\nNo. Identificación 1234567\nCódigo de Verificación 123456720260101',
        'CONTRALORIA',
      ),
    );
    expect(
      contr
        .filter((d) => d.campo === 'numeroIdentificacion')
        .map((d) => d.original),
    ).toEqual(['1234567']);
    const redam = extractor.extraer(
      documento(
        'identificación CC 1234567 NO SE ENCUENTRA INSCRITO\nEntidad con NIT 899999230-7\nCódigo Verificación: ABC123',
        'REDAM',
      ),
    );
    expect(
      redam
        .filter((d) => d.campo === 'numeroIdentificacion')
        .map((d) => d.original),
    ).toEqual(['1234567']);
  });
  it('no toma las fechas de consulta, aprobación o expedición del certificado como datos personales', () => {
    const texto =
      'Se expide en Bogotá el 19/11/2026\nFecha de Aprobación: 2026/07/09\nFecha de expedición: 19/11/2026';
    expect(extractor.extraer(documento(texto, 'PROCURADURIA'))).toEqual([]);
  });
  it('extrae campos explícitos, conserva página y no adivina apellidos a partir del nombre completo', () => {
    const datos = extractor.extraer(
      documento(
        'Nombre completo: Ana Maria Perez Gomez\nPrimer nombre: Ana\nSegundo nombre: Maria\nPrimer apellido: Perez\nSegundo apellido: Gomez\nFecha de nacimiento (DD/MM/AAAA): 05/06/1990\nLugar de nacimiento: Medellín\nNacionalidad: Colombiana\nSexo: F',
      ),
    );
    for (const c of [
      'primerNombre',
      'segundoNombre',
      'primerApellido',
      'segundoApellido',
      'fechaNacimiento',
      'lugarNacimiento',
      'nacionalidad',
      'sexo',
    ])
      expect(datos.some((d) => d.campo === c)).toBe(true);
    expect(datos.find((d) => d.campo === 'fechaNacimiento')?.formatoFecha).toBe(
      'DMY',
    );
    expect(
      extractor
        .extraer(documento('Nombre completo: Ana Maria Perez Gomez'))
        .some((d) => d.campo === 'primerApellido'),
    ).toBe(false);
  });
  it('mantiene la página física de cada dato de un documento multipágina', () => {
    const d = documento('CC 1234', 'PERSONERIA', 4);
    d.paginasTexto.push({ pagina: 5, texto: 'CC 1235' });
    d.paginaFin = 5;
    expect(
      extractor
        .extraer(d)
        .filter((x) => x.campo === 'numeroIdentificacion')
        .map((x) => [x.original, x.pagina]),
    ).toEqual([
      ['1234', 4],
      ['1235', 5],
    ]);
  });
  it('no asigna identidad a páginas sin clasificar', () => {
    const d = documento('CC 1234');
    d.estadoClasificacion = 'INCIERTO';
    expect(extractor.extraer(d)).toEqual([]);
  });
  it('no atribuye el lugar de emisión del certificado al documento de identidad', () => {
    expect(
      extractor.extraer(
        documento('Lugar de expedición: Bogotá D.C.', 'PROCURADURIA'),
      ),
    ).toEqual([]);
    const datos = extractor.extraer(
      documento(
        'Lugar de expedición del documento de identidad: Medellín',
        'PROCURADURIA',
      ),
    );
    expect(datos.find((d) => d.campo === 'lugarExpedicion')?.original).toBe(
      'Medellín',
    );
  });
});
