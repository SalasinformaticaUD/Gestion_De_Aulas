import { DocumentClassificationService } from './document-classification.service';
import { PdfTextService } from './pdf-text.service';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';
import {
  TEXTOS_DOCUMENTOS,
  PIE_POLICIA,
} from './document-classification.fixtures';

const service = new DocumentClassificationService(new PdfTextService());
const archivo = (
  textos: string[],
  nombreOriginal = 'archivo-sin-indicios.pdf',
) => ({
  nombreOriginal,
  paginas: textos.map((texto, i) => ({ pagina: i + 1, texto })),
});

describe('Clasificación documental por reglas', () => {
  it('una planilla ya no se identifica como documento del módulo', () => {
    const resultado = service.clasificarPagina({
      pagina: 1,
      texto:
        'PLANILLA INTEGRADA DE AUTOLIQUIDACION DE APORTES DATOS DEL APORTANTE DATOS DE LA PLANILLA PERIODO SALUD PERIODO PENSION RIESGOS LABORALES',
    });
    expect(resultado.tipo).toBe('NO_RECONOCIDO');
  });
  it.each(
    DOCUMENTOS_REQUERIDOS.map((doc, i) => [doc.tipo, TEXTOS_DOCUMENTOS[i]]),
  )('identifica %s por su texto', (tipo, texto) => {
    expect(service.clasificarPagina({ pagina: 1, texto }).tipo).toBe(tipo);
  });
  it('segmenta los ocho documentos en nueve páginas y respeta continuaciones', () => {
    const textos = [...TEXTOS_DOCUMENTOS];
    textos.splice(4, 0, PIE_POLICIA);
    const resultado = service.clasificarTextos([archivo(textos)]);
    expect(resultado.documentos.map((d) => d.tipo)).toEqual(
      DOCUMENTOS_REQUERIDOS.map((d) => d.tipo),
    );
    expect(resultado.documentos[3]).toMatchObject({
      paginaInicio: 4,
      paginaFin: 5,
    });
    expect(resultado.hallazgos).toEqual([]);
  });
  it('no clasifica usando nombres de archivo y no impone orden a archivos individuales', () => {
    const entradas = TEXTOS_DOCUMENTOS.map((texto, i) =>
      archivo(
        [
          i === 3
            ? texto.replace('1/2', '1/1')
            : i === 8
              ? texto.replace('1 DE 2', '1 DE 1')
              : texto,
        ],
        `equivocado-${8 - i}.pdf`,
      ),
    ).reverse();
    const resultado = service.clasificarTextos(entradas);
    expect(new Set(resultado.documentos.map((d) => d.tipo)).size).toBe(8);
    expect(resultado.hallazgos).toEqual([]);
  });
  it('identifica un documento faltante sin desplazar falsamente el orden de los restantes', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[1], TEXTOS_DOCUMENTOS[2]]),
    ]);
    expect(resultado.hallazgos).toContainEqual(
      expect.objectContaining({
        codigo: 'DOCUMENTO_FALTANTE',
        campo: 'PERSONERIA',
      }),
    );
    expect(
      resultado.hallazgos.some((h) => h.codigo === 'DOCUMENTO_FUERA_DE_ORDEN'),
    ).toBe(false);
  });
  it('acepta los documentos en posiciones invertidas', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[1], TEXTOS_DOCUMENTOS[0]]),
    ]);
    expect(
      resultado.hallazgos
        .filter((h) => h.codigo === 'DOCUMENTO_FUERA_DE_ORDEN')
        .map((h) => h.documentoIndice),
    ).toEqual([]);
  });
  it('no mezcla certificados consecutivos del mismo tipo y detecta copias por texto', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[0], TEXTOS_DOCUMENTOS[0]]),
    ]);
    expect(resultado.documentos).toHaveLength(2);
    expect(resultado.hallazgos).toContainEqual(
      expect.objectContaining({
        codigo: 'DOCUMENTO_DUPLICADO',
        campo: 'PERSONERIA',
        documentoIndice: 1,
        observacion: expect.stringContaining(
          'mismo texto normalizado',
        ) as unknown,
      }),
    );
  });
  it('detecta dos versiones del mismo certificado en archivos distintos', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[0] + ' CODIGO 111']),
      archivo([TEXTOS_DOCUMENTOS[0] + ' CODIGO 222']),
    ]);
    expect(
      resultado.hallazgos.filter((h) => h.codigo === 'DOCUMENTO_DUPLICADO'),
    ).toHaveLength(1);
  });
  it('marca una página ajena sin absorberla en el documento anterior', () => {
    const resultado = service.clasificarTextos([
      archivo([
        TEXTOS_DOCUMENTOS[0],
        'Solicitud de prestamo de aulas de software. Se solicita reservar la sala para una reunion institucional.',
      ]),
    ]);
    expect(resultado.documentos[0].paginaFin).toBe(1);
    expect(resultado.documentos[1]).toMatchObject({
      tipo: 'NO_RECONOCIDO',
      estadoClasificacion: 'NO_ESPERADO',
      paginaInicio: 2,
    });
    expect(resultado.hallazgos).toContainEqual(
      expect.objectContaining({ codigo: 'PAGINA_NO_ESPERADA' }),
    );
  });
  it('requiere revisión para texto insuficiente, errores de extracción y candidatos empatados', () => {
    expect(service.clasificarPagina({ pagina: 1, texto: '' }).estado).toBe(
      'SIN_TEXTO',
    );
    expect(
      service.clasificarPagina({ pagina: 1, texto: '', error: true }).estado,
    ).toBe('ERROR_EXTRACCION');
    expect(
      service.clasificarPagina({
        pagina: 1,
        texto:
          'LA PERSONERIA DE BOGOTA CERTIFICADO DE ANTECEDENTES DISCIPLINARIOS PROCURADURIA GENERAL DE LA NACION',
      }).estado,
    ).toBe('INCIERTO');
  });
  it('no convierte una mención genérica de una entidad en una identificación cierta', () => {
    expect(
      service.clasificarPagina({
        pagina: 1,
        texto:
          'Se adjunta informacion acerca de Procuraduria y su registro SIRI para revision de antecedentes.',
      }).tipo,
    ).toBe('NO_RECONOCIDO');
  });
  it('no hereda páginas sin texto ni confunde paginación de otro documento', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[3], '', TEXTOS_DOCUMENTOS[6] + ' 2/2']),
    ]);
    expect(resultado.documentos).toHaveLength(3);
    expect(resultado.documentos[1]).toMatchObject({
      tipo: 'NO_RECONOCIDO',
      requiereOcr: true,
    });
    expect(resultado.hallazgos).toContainEqual(
      expect.objectContaining({ codigo: 'LIMITES_DOCUMENTO_INCIERTOS' }),
    );
    expect(resultado.documentos[2].tipo).toBe('REDAM');
  });
  it('no llama faltante confirmado a lo que podría estar en páginas sin clasificar', () => {
    const resultado = service.clasificarTextos([archivo([''])]);
    expect(
      resultado.hallazgos.filter((h) => h.codigo === 'DOCUMENTO_FALTANTE'),
    ).toHaveLength(8);
    expect(
      resultado.hallazgos.find((h) => h.codigo === 'DOCUMENTO_FALTANTE')
        ?.observacion,
    ).toContain('Podría estar entre las páginas');
  });
  it('no asegura límites ni duplicados cuando faltan números de página y los segmentos difieren', () => {
    const resultado = service.clasificarTextos([
      archivo([
        TEXTOS_DOCUMENTOS[0] + ' CONTENIDO A',
        TEXTOS_DOCUMENTOS[0] + ' CONTENIDO B',
      ]),
    ]);
    expect(resultado.documentos.every((d) => d.requiereRevisionManual)).toBe(
      true,
    );
    expect(resultado.hallazgos).toContainEqual(
      expect.objectContaining({ codigo: 'POSIBLE_DOCUMENTO_DUPLICADO' }),
    );
    expect(resultado.hallazgos).toContainEqual(
      expect.objectContaining({ codigo: 'LIMITES_DOCUMENTO_INCIERTOS' }),
    );
  });
  it('acepta cualquier orden dentro de un archivo compuesto', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[1], TEXTOS_DOCUMENTOS[0]]),
    ]);
    expect(
      resultado.hallazgos.filter(
        (h) => h.codigo === 'DOCUMENTO_FUERA_DE_ORDEN',
      ),
    ).toHaveLength(0);
  });
  it('no confunde el orden de selección con el orden interno cuando hay archivos compuestos', () => {
    const resultado = service.clasificarTextos([
      archivo([TEXTOS_DOCUMENTOS[6]]),
      archivo([TEXTOS_DOCUMENTOS[0], TEXTOS_DOCUMENTOS[1]]),
    ]);
    expect(
      resultado.hallazgos.some((h) => h.codigo === 'DOCUMENTO_FUERA_DE_ORDEN'),
    ).toBe(false);
  });
  it('un duplicado al final no convierte los documentos bien ordenados en documentos fuera de orden', () => {
    const resultado = service.clasificarTextos([
      archivo([
        TEXTOS_DOCUMENTOS[0],
        TEXTOS_DOCUMENTOS[1],
        TEXTOS_DOCUMENTOS[0],
      ]),
    ]);
    expect(
      resultado.hallazgos.some((h) => h.codigo === 'DOCUMENTO_DUPLICADO'),
    ).toBe(true);
    expect(
      resultado.hallazgos.some((h) => h.codigo === 'DOCUMENTO_FUERA_DE_ORDEN'),
    ).toBe(false);
  });
});
