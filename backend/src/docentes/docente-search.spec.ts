import {
  filtroBusquedaDocente,
  filtroNombreDocente,
  normalizarBusquedaDocente,
} from './docente-search';

describe('búsqueda de docentes', () => {
  it('normaliza tildes tanto precompuestas como combinadas', () => {
    expect(normalizarBusquedaDocente('  JOSÉ Muñoz Ü  ')).toBe('jose munoz u');
    expect(normalizarBusquedaDocente('Jose\u0301')).toBe('jose');
  });

  it('busca cada fragmento del nombre con parámetros independientes', () => {
    const sql = filtroNombreDocente('  GÓMEZ   josé ');
    expect(sql.values).toEqual(['%gomez%', '%jose%']);
    expect(sql.text).toContain(' AND ');
  });

  it('trata comodines y contenido SQL como texto de búsqueda', () => {
    const query = "pérez%_\\' OR 1=1 --";
    const sql = filtroBusquedaDocente(query);
    expect(sql.text).not.toContain('OR 1=1');
    expect(sql.values).toContain("%perez\\%\\_\\\\' or 1=1 --%");
    expect(sql.text).toContain('"correo"');
    expect(sql.text).toContain('"documento"');
    expect(sql.text).toContain('"proyecto"');
  });
});
