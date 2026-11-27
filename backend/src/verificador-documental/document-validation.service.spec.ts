import { DocumentValidationService } from './document-validation.service';
import { PersonalDataExtractionService } from './personal-data-extraction.service';
import { PersonalDataComparisonService } from './personal-data-comparison.service';
import {
  DocumentClassificationService,
  type DocumentoClasificado,
} from './document-classification.service';
import { PdfTextService } from './pdf-text.service';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';
import { TEXTOS_VALIDACION } from './document-validation.fixtures';

const service = new DocumentValidationService();
const extractor = new PersonalDataExtractionService();
function documento(
  i: number,
  texto = TEXTOS_VALIDACION[i],
): DocumentoClasificado {
  return {
    archivoIndice: 0,
    tipo: DOCUMENTOS_REQUERIDOS[i].tipo,
    paginaInicio: i + 4,
    paginaFin: i + 4,
    textoExtraido: texto,
    paginasTexto: [{ pagina: i + 4, texto }],
    requiereOcr: false,
    estadoClasificacion: 'IDENTIFICADO',
    puntajeClasificacion: 8,
    evidenciasClasificacion: {
      senales: [],
      candidatos: [],
      porContexto: false,
    },
    requiereRevisionManual: false,
  };
}
function validar(
  i: number,
  texto = TEXTOS_VALIDACION[i],
  fecha = '2026-11-25',
) {
  const d = documento(i, texto);
  return service.validar([d], [{ datos: extractor.extraer(d) }], fecha);
}
function check(r: ReturnType<typeof validar>, campo: string) {
  return r.documentos[0].comprobaciones.filter((c) => c.campo === campo);
}

describe.each(DOCUMENTOS_REQUERIDOS.map((d, i) => ({ ...d, i })))(
  '$tipo: reglas individuales',
  ({ i }) => {
    it('extrae identidad y comprueba sus campos sin imponer una fuente de verdad', () => {
      const r = validar(i);
      expect(check(r, 'numeroIdentificacion')[0]).toMatchObject({
        estado: 'OK',
        valores: [
          expect.objectContaining({ normalizado: '001234567', pagina: i + 4 }),
        ],
      });
      expect(check(r, 'tipoIdentificacion')[0].estado).toBe('OK');
      expect(
        r.hallazgos.filter((h) => h.codigo !== 'FIRMA_REQUIERE_REVISION'),
      ).toEqual([]);
    });
    it('marca identificación ausente como no verificable sin inventar un número', () => {
      const d = documento(i);
      const datos = extractor
        .extraer(d)
        .filter((v) => v.campo !== 'numeroIdentificacion');
      const r = service.validar([d], [{ datos }], '2026-11-25');
      expect(r.hallazgos).toContainEqual(
        expect.objectContaining({
          campo: 'numeroIdentificacion',
          pagina: i + 4,
          codigo: 'CAMPO_OBLIGATORIO_NO_EXTRAIDO',
          requiereRevisionManual: true,
        }),
      );
    });
    it('conserva originales, páginas y datos de entrada', () => {
      const d = documento(i),
        datos = extractor.extraer(d);
      const original = JSON.stringify({ d, datos });
      const r = service.validar([d], [{ datos }], '2026-11-25');
      expect(JSON.stringify({ d, datos })).toBe(original);
      expect(
        r.documentos[0].comprobaciones.every((c) =>
          c.valores.every((v) => v.pagina === i + 4),
        ),
      ).toBe(true);
    });
  },
);

describe.each(DOCUMENTOS_REQUERIDOS.slice(0, 7).map((d, i) => ({ ...d, i })))(
  '$tipo: certificados',
  ({ i }) => {
    it('reconoce exclusivamente su fecha de emisión o consulta', () => {
      expect(check(validar(i), 'fechaCertificado')[0]).toMatchObject({
        estado: 'OK',
        valores: [expect.objectContaining({ normalizado: '2026-11-19' })],
      });
    });
    it('no sustituye la emisión por nacimiento, expedición de cédula o fechas legales', () => {
      const r = validar(
        i,
        'Cédula de Ciudadanía 001234567\nFecha de nacimiento: 19/11/1990\nFecha de expedición del documento de identidad: 19/11/2010\nLey del 19/11/2020\nFecha de Aprobación: 2026/07/09',
      );
      expect(check(r, 'fechaCertificado')[0]).toMatchObject({
        estado: 'NO_VERIFICABLE',
        valores: [],
      });
    });
    it('marca emisión posterior a la solicitud', () => {
      const r = validar(i, TEXTOS_VALIDACION[i], '2026-11-18');
      expect(
        r.hallazgos.some(
          (h) =>
            h.codigo === 'FECHA_POSTERIOR_SOLICITUD' &&
            h.campo === 'fechaCertificado',
        ),
      ).toBe(true);
    });
  },
);

describe('Reglas de certificados y vigencia expresa', () => {
  it.each([2, 4, 6])('no exige nombre que el formato %i no contiene', (i) =>
    expect(check(validar(i), 'nombreCompleto')).toEqual([]),
  );
  it.each([0, 1, 3, 5])('exige nombre del titular en el formato %i', (i) => {
    const d = documento(i);
    const r = service.validar(
      [d],
      [
        {
          datos: extractor
            .extraer(d)
            .filter((v) => v.campo !== 'nombreCompleto'),
        },
      ],
      '2026-11-25',
    );
    expect(r.hallazgos).toContainEqual(
      expect.objectContaining({
        campo: 'nombreCompleto',
        codigo: 'CAMPO_OBLIGATORIO_NO_EXTRAIDO',
      }),
    );
  });
  it.each(DOCUMENTOS_REQUERIDOS.map((_, i) => i))(
    'no sustituye el tipo de identificación ausente por CC en %i',
    (i) => {
      const d = documento(i);
      const r = service.validar(
        [d],
        [
          {
            datos: extractor
              .extraer(d)
              .filter((v) => v.campo !== 'tipoIdentificacion'),
          },
        ],
        '2026-11-25',
      );
      expect(
        r.hallazgos.some(
          (h) =>
            h.campo === 'tipoIdentificacion' &&
            h.codigo === 'CAMPO_OBLIGATORIO_NO_EXTRAIDO',
        ),
      ).toBe(true);
    },
  );
  it('REDAM: detecta vigencia impresa vencida', () =>
    expect(
      validar(6, TEXTOS_VALIDACION[6], '2027-02-20').hallazgos,
    ).toContainEqual(
      expect.objectContaining({
        codigo: 'VIGENCIA_EXPRESA_INCONSISTENTE',
        valorEncontrado: '19/02/2027',
      }),
    ));
  it('la vigencia es inclusiva en el día impreso', () =>
    expect(validar(6, TEXTOS_VALIDACION[6], '2027-02-19').hallazgos).toEqual(
      [],
    ));
  it('vigencia anterior a emisión es contradictoria', () =>
    expect(
      validar(
        6,
        TEXTOS_VALIDACION[6].replace('19/02/2027', '18/11/2026'),
      ).hallazgos.some((h) => h.codigo === 'VIGENCIA_EXPRESA_INCONSISTENTE'),
    ).toBe(true));
  it('no inventa vencimientos de 30/90 días', () =>
    expect(validar(0, TEXTOS_VALIDACION[0], '2030-11-25').hallazgos).toEqual(
      [],
    ));
  it('una fecha ambigua requiere revisión y no se interpreta según la zona del servidor', () =>
    expect(
      check(
        validar(3, TEXTOS_VALIDACION[3].replace('19/11/2026', '05/06/2026')),
        'fechaCertificado',
      )[0].estado,
    ).toBe('NO_VERIFICABLE'));
  it('un formato de fecha declarado explícitamente resuelve la ambigüedad', () =>
    expect(
      check(
        validar(0, 'Fecha de expedición (DD/MM/AAAA): 05/06/2026'),
        'fechaCertificado',
      )[0].valores[0].normalizado,
    ).toBe('2026-06-05'));
  it('no admite fechas imposibles ni normaliza por rollover', () =>
    expect(
      check(
        validar(3, TEXTOS_VALIDACION[3].replace('19/11/2026', '31/02/2026')),
        'fechaCertificado',
      )[0].estado,
    ).toBe('NO_VERIFICABLE'));
  it('no reemplaza resultados desconocidos por una aprobación', () =>
    expect(
      validar(
        6,
        TEXTOS_VALIDACION[6].replace(
          'NO SE ENCUENTRA INSCRITO EN EL REGISTRO DE DEUDORES ALIMENTARIOS MOROSOS',
          'RESULTADO NO DISPONIBLE',
        ),
      ).hallazgos.some((h) => h.codigo === 'RESULTADO_NO_EXTRAIDO'),
    ).toBe(true));
  it('una anotación positiva exige revisión, sin determinar habilitación jurídica', () =>
    expect(
      validar(
        5,
        TEXTOS_VALIDACION[5].replaceAll(
          'NO REGISTRA INHABILIDAD',
          'REGISTRA INHABILIDAD',
        ),
      ).hallazgos.some((h) => h.codigo === 'RESULTADO_REQUIERE_REVISION'),
    ).toBe(true));
  it('fechas distintas entre páginas son contradictorias', () => {
    const d = documento(0);
    d.paginasTexto.push({
      pagina: 11,
      texto: 'Bogotá D.C., 20 de noviembre de 2026',
    });
    const r = service.validar(
      [d],
      [{ datos: extractor.extraer(d) }],
      '2026-11-25',
    );
    expect(
      r.hallazgos.find(
        (h) => h.codigo === 'FECHAS_DOCUMENTALES_CONTRADICTORIAS',
      )?.evidencia.paginas,
    ).toEqual([4, 11]);
  });
});

describe('GC-PR-002-FR-038: diligenciamiento', () => {
  it('comprueba código, identidad, lugar, declaración y fecha; deriva firma a revisión', () => {
    const r = validar(7);
    expect(r.hallazgos.map((h) => h.codigo)).toEqual([
      'FIRMA_REQUIERE_REVISION',
    ]);
    expect(check(r, 'fechaDeclaracion')[0].valores[0]).toMatchObject({
      original: 'Bogotá D.C., a los 19 días del mes de Noviembre del año 2026.',
      normalizado: '2026-11-19',
    });
  });
  it('detecta el día pendiente de los formatos de ejemplo', () =>
    expect(
      validar(
        7,
        TEXTOS_VALIDACION[7].replace('a los 19 días', 'a los __________ días'),
      ).hallazgos.some((h) => h.codigo === 'DECLARACION_FECHA_INCOMPLETA'),
    ).toBe(true));
  it('acepta delimitadores en mes/año diligenciados sin cambiar el original', () =>
    expect(
      check(
        validar(
          7,
          TEXTOS_VALIDACION[7].replace(
            'Noviembre del año 2026',
            '_Noviembre_ del año _2026_',
          ),
        ),
        'fechaDeclaracion',
      )[0].estado,
    ).toBe('OK'));
  it('fecha de aprobación del formato no sustituye la firma/diligenciamiento', () =>
    expect(
      check(
        validar(7, TEXTOS_VALIDACION[7].replace(/Dada en[^\n]+/, '')),
        'fechaDeclaracion',
      )[0].estado,
    ).toBe('NO_VERIFICABLE'));
  it('rechaza un código diferente aunque contenga el título', () =>
    expect(
      check(
        validar(
          7,
          TEXTOS_VALIDACION[7].replace(
            'Código: GC-PR-002-FR-038',
            'Código: GC-PR-002-FR-039',
          ),
        ),
        'codigoFormato',
      )[0].estado,
    ).toBe('INCONSISTENCIA'));
  it('no exige una versión fija', () =>
    expect(
      check(
        validar(7, TEXTOS_VALIDACION[7].replace('Versión: 04', 'Versión: 05')),
        'codigoFormato',
      )[0].estado,
    ).toBe('OK'));
  it('marca declaración truncada sin juramento como no verificable', () =>
    expect(
      check(
        validar(
          7,
          TEXTOS_VALIDACION[7].replace('bajo la gravedad del juramento', ''),
        ),
        'declaracion',
      )[0].estado,
    ).toBe('NO_VERIFICABLE'));
  it.each([
    'Dirección: _______',
    'Correo electrónico: ',
    'Teléfono: N/A',
    'Primer nombre: ______',
  ])('detecta campo identificado vacío: %s', (linea) =>
    expect(
      validar(7, `${TEXTOS_VALIDACION[7]}\n${linea}`).hallazgos.some(
        (h) => h.codigo === 'CAMPO_OBLIGATORIO_VACIO',
      ),
    ).toBe(true),
  );
  it('no afirma ausencia ni autenticidad de firma a partir de la palabra Firma', () => {
    for (const firma of ['Firma', 'Firma: Ana Maria Perez Gomez', ''])
      expect(
        validar(7, TEXTOS_VALIDACION[7].replace('Firma', firma)).hallazgos,
      ).toContainEqual(
        expect.objectContaining({
          codigo: 'FIRMA_REQUIERE_REVISION',
          requiereRevisionManual: true,
        }),
      );
  });
});

describe('Integración de clasificación, extracción, comparación y reglas particulares', () => {
  it.each(
    ['PDF_UNIFICADO', 'PDF_SEPARADOS'].flatMap((modalidad) => [
      { modalidad, indices: [0, 1, 2, 3, 4, 5, 6, 7] },
      { modalidad, indices: [7, 6, 5, 4, 3, 2, 1, 0] },
      { modalidad, indices: [3, 0, 7, 1, 6, 2, 5, 4] },
    ]),
  )(
    'revisa los ocho documentos en $modalidad con posiciones $indices',
    ({ modalidad, indices }) => {
      const paginas = indices.map((indice, pos) => ({
        pagina: pos + 1,
        texto:
          indice === 7
            ? TEXTOS_VALIDACION[indice].replaceAll('001234567', '009999999')
            : TEXTOS_VALIDACION[indice],
      }));
      const archivos =
        modalidad === 'PDF_UNIFICADO'
          ? [{ nombreOriginal: 'unificado.pdf', paginas }]
          : paginas.map((p, i) => ({
              nombreOriginal: `${i}.pdf`,
              paginas: [{ ...p, pagina: 1 }],
            }));
      const resultado = new DocumentClassificationService(
        new PdfTextService(),
      ).clasificarTextos(archivos);
      expect(resultado.documentos.map((d) => d.tipo)).toEqual(
        indices.map((i) => DOCUMENTOS_REQUERIDOS[i].tipo),
      );
      expect(
        resultado.hallazgos.some(
          (h) => h.codigo === 'DOCUMENTO_FUERA_DE_ORDEN',
        ),
      ).toBe(false);
      const datos = resultado.documentos.map((d, documentoIndice) => ({
        documentoIndice,
        tipo: d.tipo,
        datos: extractor.extraer(d),
      }));
      const comparacion = new PersonalDataComparisonService().comparar(datos);
      expect(
        comparacion.campos.find((c) => c.campo === 'numeroIdentificacion')
          ?.mayoritario?.votos,
      ).toBe(7);
      expect(
        comparacion.hallazgos.find((h) => h.codigo === 'DIFERENCIA_NUMERICA'),
      ).toMatchObject({
        documentoIndice: indices.indexOf(7),
        pagina: modalidad === 'PDF_UNIFICADO' ? indices.indexOf(7) + 1 : 1,
        valorEncontrado: '009999999',
      });
      const reglas = service.validar(
        resultado.documentos,
        datos,
        '2026-11-25',
        comparacion.hallazgos,
      );
      expect(reglas.documentos).toHaveLength(8);
      expect(
        reglas.documentos
          .find((d) => d.tipo === 'DECLARACION_VERACIDAD')
          ?.comprobaciones.find((c) => c.campo === 'numeroIdentificacion')
          ?.estado,
      ).toBe('INCONSISTENCIA');
    },
  );
  it('excluye la planilla del catálogo y de los votos de nuevas verificaciones', () => {
    expect(DOCUMENTOS_REQUERIDOS).toHaveLength(8);
    expect(
      DOCUMENTOS_REQUERIDOS.some((d) => String(d.tipo) === 'SEGURIDAD_SOCIAL'),
    ).toBe(false);
    const documentos = TEXTOS_VALIDACION.map((t, i) => documento(i, t));
    const datos = documentos.map((d, documentoIndice) => ({
      documentoIndice,
      tipo: String(d.tipo),
      datos: extractor.extraer(d),
    }));
    datos.push({
      documentoIndice: 8,
      tipo: 'SEGURIDAD_SOCIAL',
      datos: [
        {
          campo: 'numeroIdentificacion',
          original: '999999999',
          pagina: 9,
          regla: 'registro-legado',
        },
      ],
    });
    const comparacion = new PersonalDataComparisonService().comparar(datos);
    expect(
      comparacion.campos.find((c) => c.campo === 'numeroIdentificacion')
        ?.mayoritario?.votos,
    ).toBe(8);
    expect(comparacion.hallazgos.some((h) => h.documentoIndice === 8)).toBe(
      false,
    );
    const validacion = service.validar(documentos, datos, '2026-11-25');
    expect(validacion).not.toHaveProperty('periodoEsperado');
    expect(validacion.documentos).toHaveLength(8);
    expect(validacion.version).toBe('particulares-v2');
  });
  it.each(['PDF_UNIFICADO', 'PDF_SEPARADOS'])(
    'funciona con %s y mantiene los ocho tipos',
    (modalidad) => {
      const paginas = TEXTOS_VALIDACION.map((texto, i) => ({
        pagina: i + 1,
        texto,
      }));
      const archivos =
        modalidad === 'PDF_UNIFICADO'
          ? [{ nombreOriginal: 'unificado.pdf', paginas }]
          : paginas.map((p, i) => ({
              nombreOriginal: `${i}.pdf`,
              paginas: [{ ...p, pagina: 1 }],
            }));
      const clasificacion = new DocumentClassificationService(
        new PdfTextService(),
      ).clasificarTextos(archivos);
      expect(clasificacion.documentos.map((d) => d.tipo)).toEqual(
        DOCUMENTOS_REQUERIDOS.map((d) => d.tipo),
      );
      const datos = clasificacion.documentos.map((d, documentoIndice) => ({
        documentoIndice,
        tipo: d.tipo,
        datos: extractor.extraer(d),
      }));
      const comparacion = new PersonalDataComparisonService().comparar(datos);
      const resultado = service.validar(
        clasificacion.documentos,
        datos,
        '2026-11-25',
      );
      expect(comparacion.resumen.camposConDiferencias).toBe(0);
      expect(resultado.hallazgos.map((h) => h.codigo)).toEqual([
        'FIRMA_REQUIERE_REVISION',
      ]);
    },
  );
  it('una diferencia de identificación de la declaración llega al motor principal', () => {
    const documentos = TEXTOS_VALIDACION.map((t, i) =>
      documento(i, i === 7 ? t.replaceAll('001234567', '009999999') : t),
    );
    const datos = documentos.map((d, documentoIndice) => ({
      documentoIndice,
      tipo: d.tipo,
      datos: extractor.extraer(d),
    }));
    const r = new PersonalDataComparisonService().comparar(datos);
    expect(r.hallazgos).toContainEqual(
      expect.objectContaining({
        documentoIndice: 7,
        pagina: 11,
        codigo: 'DIFERENCIA_NUMERICA',
        valorEncontrado: '009999999',
      }),
    );
    const particular = service.validar(
      documentos,
      datos,
      '2026-11-25',
      r.hallazgos,
    );
    expect(
      particular.documentos[7].comprobaciones.find(
        (c) => c.campo === 'numeroIdentificacion',
      )?.estado,
    ).toBe('INCONSISTENCIA');
    expect(
      particular.hallazgos.some((h) => h.codigo === 'DIFERENCIA_NUMERICA'),
    ).toBe(false);
  });
});
