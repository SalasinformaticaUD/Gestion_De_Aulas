import type { DatoPersonal, DatoNormalizado } from './personal-data.types';

export function textoNormalizado(valor: string) {
  // Ñ es una letra distinta: no se transforma silenciosamente en N.
  return valor
    .normalize('NFC')
    .toUpperCase()
    .normalize('NFD')
    .replace(/N\u0303/g, 'Ñ')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
export function nombreNormalizado(valor: string) {
  return textoNormalizado(valor)
    .replace(/[‐‑–—-]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
const meses: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};
export function normalizarFecha(
  original: string,
  formato?: DatoPersonal['formatoFecha'],
): { valor: string | null; motivo?: string } {
  const texto = textoNormalizado(original);
  let year: number, month: number, day: number;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(texto);
  if (m) {
    year = +m[1];
    month = +m[2];
    day = +m[3];
  } else if (
    (m = /^(\d{1,2})(?: DE)? ([A-Z]+)(?: DE| DEL)? (\d{4})$/.exec(texto))
  ) {
    day = +m[1];
    month = meses[m[2]];
    year = +m[3];
  } else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(texto))) {
    const a = +m[1],
      b = +m[2];
    year = +m[3];
    if (!formato && a <= 12 && b <= 12 && a !== b)
      return { valor: null, motivo: 'FORMATO_FECHA_AMBIGUO' };
    if (formato === 'MDY' || (!formato && b > 12)) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
  } else return { valor: null, motivo: 'FECHA_NO_INTERPRETABLE' };
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1000 ||
    year > 9999 ||
    !month ||
    month > 12 ||
    day < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return { valor: null, motivo: 'FECHA_INVALIDA' };
  return {
    valor: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}
export function tipoIdentificacion(valor: string): string | null {
  const v = textoNormalizado(valor).replace(/[.\s]/g, '');
  const aliases: Record<string, string> = {
    CC: 'CC',
    CEDULADECIUDADANIA: 'CC',
    CEDULACIUDADANIA: 'CC',
    CE: 'CE',
    CEDULADEEXTRANJERIA: 'CE',
    TI: 'TI',
    TARJETADEIDENTIDAD: 'TI',
    PASAPORTE: 'PASAPORTE',
    PA: 'PASAPORTE',
    PP: 'PASAPORTE',
    PEP: 'PEP',
    PERMISOESPECIALDEPERMANENCIA: 'PEP',
    PPT: 'PPT',
    PERMISOPORPROTECCIONTEMPORAL: 'PPT',
    OTRO: 'OTRO',
  };
  return aliases[v] ?? null;
}
export function normalizarDato(dato: DatoPersonal): DatoNormalizado {
  const result = (
    normalizado: string | null,
    motivo?: string,
  ): DatoNormalizado => ({
    ...dato,
    normalizado,
    ...(motivo ? { motivo } : {}),
  });
  const v = textoNormalizado(dato.original);
  if (
    !v ||
    /^[_\s-]+$/.test(v) ||
    ['N/A', 'NO APLICA', 'SIN INFORMACION'].includes(v)
  )
    return result(null, 'DATO_VACIO');
  if (dato.campo === 'tipoIdentificacion') {
    const t = tipoIdentificacion(v);
    return result(t, t ? undefined : 'TIPO_NO_RECONOCIDO');
  }
  if (dato.campo === 'numeroIdentificacion') {
    if (!/^[\p{L}\d .-]+$/u.test(v) || !/[0-9]/.test(v))
      return result(null, 'IDENTIFICACION_NO_INTERPRETABLE');
    return result(v.replace(/[.\s-]/g, ''));
  }
  if (dato.campo.startsWith('fecha')) {
    const f = normalizarFecha(dato.original, dato.formatoFecha);
    return result(f.valor, f.motivo);
  }
  if (
    dato.campo.toLowerCase().includes('nombre') ||
    dato.campo.toLowerCase().includes('apellido')
  )
    return result(nombreNormalizado(dato.original));
  if (dato.campo.startsWith('lugar')) {
    const p = v.replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
    return result(
      /^BOGOTA(?: D C| DC| DISTRITO CAPITAL)?(?: COLOMBIA)?$/.test(p)
        ? 'BOGOTA DC'
        : p,
    );
  }
  if (dato.campo === 'sexo')
    return result(
      ({ M: 'MASCULINO', F: 'FEMENINO' } as Record<string, string>)[v] ?? v,
    );
  if (dato.campo === 'nacionalidad')
    return result(
      ['COLOMBIA', 'COLOMBIANO', 'COLOMBIANA'].includes(v) ? 'COLOMBIANA' : v,
    );
  if (dato.campo === 'correo') {
    const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return result(
      valido ? v.toLowerCase() : null,
      valido ? undefined : 'CORREO_NO_INTERPRETABLE',
    );
  }
  if (dato.campo === 'telefono') {
    const valido = /^[+\d ().-]+$/.test(v);
    return result(
      valido ? v.replace(/[^\d+]/g, '') : null,
      valido ? undefined : 'TELEFONO_NO_INTERPRETABLE',
    );
  }
  return result(v);
}
export function distanciaEdicion(a: string, b: string): number {
  if (a.length > 300 || b.length > 300) return Math.max(a.length, b.length);
  const d = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
export function esRotacionNombre(a: string, b: string) {
  const x = a.split(' '),
    y = b.split(' ');
  if (x.length !== y.length) return false;
  return x.some((_, i) => [...x.slice(i), ...x.slice(0, i)].join(' ') === b);
}
