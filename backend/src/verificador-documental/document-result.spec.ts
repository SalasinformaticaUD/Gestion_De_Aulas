import {
  determinarResultadoDocumental,
  comprobarCierrePersistido,
} from './document-result';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';

function entrada(): Parameters<typeof determinarResultadoDocumental>[0] {
  return {
    documentos: DOCUMENTOS_REQUERIDOS.map(({ tipo }) => ({
      tipo,
      estadoClasificacion: 'IDENTIFICADO',
      requiereOcr: false,
      requiereRevisionManual: false,
    })),
    hallazgos: [],
    comparacion: {
      resumen: { camposConDiferencias: 0 },
      campos: [
        'nombreCompleto',
        'numeroIdentificacion',
        'tipoIdentificacion',
      ].map((campo) => ({
        campo,
        estado: 'COINCIDENCIA_NORMALIZADA',
        fuentesIndependientes: 8,
        noInterpretables: [],
        tiposEnConflicto: [],
      })),
    },
    validacion: {
      resumen: { inconsistencias: 0, noVerificables: 0 },
      documentos: DOCUMENTOS_REQUERIDOS.map(({ tipo }, documentoIndice) => ({
        tipo,
        documentoIndice,
        comprobaciones: [
          {
            campo: 'identidad',
            estado: 'OK',
            codigo: 'PRUEBA',
            observacion:
              'Evidencia positiva para probar el cierre; no simula una firma validada en producción.',
            valores: [],
          },
        ],
      })),
    },
  };
}

describe('Estado final documental: cierre conservador', () => {
  it('solo admite éxito con ocho tipos, evidencias completas e identidad coincidente', () =>
    expect(determinarResultadoDocumental(entrada())).toBe('SATISFACTORIA'));
  it.each(DOCUMENTOS_REQUERIDOS.map((d) => d.tipo))(
    'impide éxito si falta %s aunque no haya hallazgo ni contadores de error',
    (tipo) => {
      const e = entrada();
      e.documentos = e.documentos.filter((d) => d.tipo !== tipo);
      expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
    },
  );
  it.each([
    'SIN_TEXTO',
    'ERROR_EXTRACCION',
    'INCIERTO',
    'NO_ESPERADO',
    'IDENTIFICADO',
  ] as const)(
    'impide éxito con una página %s que requiere revisión',
    (estado) => {
      const e = entrada();
      e.documentos[0].estadoClasificacion = estado;
      e.documentos[0].requiereRevisionManual = true;
      expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
    },
  );
  it('impide éxito si el OCR está pendiente aunque la clasificación diga identificado', () => {
    const e = entrada();
    e.documentos[0].requiereOcr = true;
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it.each([
    'FIRMA_REQUIERE_REVISION',
    'DATO_NO_INTERPRETABLE',
    'EMPATE_EN_CAMPO',
    'PERIODO_COTIZACION_NO_VERIFICABLE',
    'REVISION_DOCUMENTAL_PENDIENTE',
    'CODIGO_DESCONOCIDO',
  ])('cualquier hallazgo pendiente %s bloquea éxito', (codigo) => {
    const e = entrada();
    e.hallazgos.push({ codigo });
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it('las diferencias prevalecen si también faltan documentos', () => {
    const e = entrada();
    e.documentos.pop();
    e.hallazgos.push({ codigo: 'DIFERENCIA_NUMERICA' });
    expect(determinarResultadoDocumental(e)).toBe('CON_INCONSISTENCIAS');
  });
  it('no confía en un contador cero si una regla contiene una inconsistencia', () => {
    const e = entrada();
    e.validacion.documentos[0].comprobaciones[0].estado = 'INCONSISTENCIA';
    expect(determinarResultadoDocumental(e)).toBe('CON_INCONSISTENCIAS');
  });
  it('no confía en un contador cero si una regla no es verificable', () => {
    const e = entrada();
    e.validacion.documentos[0].comprobaciones[0].estado = 'NO_VERIFICABLE';
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it('no admite una validación vacía como evidencia positiva', () => {
    const e = entrada();
    e.validacion.documentos[0].comprobaciones = [];
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it('no admite un tipo sin validación particular', () => {
    const e = entrada();
    e.validacion.documentos.pop();
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it('no admite documentos duplicados aunque haya ocho tipos', () => {
    const e = entrada();
    e.documentos.push({ ...e.documentos[0] });
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it.each([
    'EMPATE',
    'SIN_DATOS',
    'INFORMACION_INSUFICIENTE',
    'MAYORIA_RELATIVA',
  ])('requiere coincidencia positiva de identidad: %s', (estado) => {
    const e = entrada();
    e.comparacion.campos[0].estado = estado;
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it('no admite un dato obligatorio con una sola fuente', () => {
    const e = entrada();
    e.comparacion.campos[0].fuentesIndependientes = 1;
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
  it('no admite valores no interpretables ocultos por un contador cero', () => {
    const e = entrada();
    e.comparacion.campos[0].noInterpretables.push({ original: '???' });
    expect(determinarResultadoDocumental(e)).toBe('INCOMPLETA');
  });
});

describe('Lectura segura del resultado histórico', () => {
  function guardado(resultado: unknown) {
    const e = entrada();
    return comprobarCierrePersistido({
      versionClasificacion: 'reglas-v1',
      versionComparacion: 'comparacion-v1',
      resultadoComparacion: resultado,
      documentos: e.documentos,
      hallazgos: [],
    });
  }
  it.each([
    null,
    {},
    [],
    { campos: [] },
    {
      resumen: { camposConDiferencias: 0 },
      campos: [],
      validacionDocumental: {},
    },
  ])('un JSON incompleto %j no es una aprobación', (json) =>
    expect(guardado(json)).toBe('INCOMPLETA'),
  );
  it('reconoce un resultado completo sin mutar sus evidencias', () => {
    const e = entrada(),
      json = { ...e.comparacion, validacionDocumental: e.validacion };
    const antes = JSON.stringify(json);
    expect(guardado(json)).toBe('SATISFACTORIA');
    expect(JSON.stringify(json)).toBe(antes);
  });
  it('una comprobación pendiente impide un éxito almacenado', () => {
    const e = entrada();
    e.validacion.documentos[0].comprobaciones[0].estado = 'NO_VERIFICABLE';
    expect(
      guardado({ ...e.comparacion, validacionDocumental: e.validacion }),
    ).toBe('INCOMPLETA');
  });
});
