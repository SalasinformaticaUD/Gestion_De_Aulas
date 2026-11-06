// Servicio del módulo monitoreo-software: resuelve el endpoint de filtros
// consultando Softracker en solo lectura y aplicando una caché mínima de una
// sola entrada compartida por solicitudes simultáneas.
//
// La respuesta se arma con `construirRespuestaFiltros` (función pura), de modo
// que el orden y la deduplicación no dependen de la collation de PostgreSQL.
// Las sentencias SQL son constantes del módulo: ningún valor de la petición
// entra en ellas, lo que evita inyección por construcción (Req. 5.1).

import { Inject, Injectable } from '@nestjs/common';

import { construirRespuestaFiltros } from './filtros.mapper';
import {
  ESTADO_SOFTWARE_ACTIVO,
  RELOJ_MONITOREO,
  TTL_FILTROS_MS,
} from './monitoreo-software.constants';
import type { RelojMonitoreo } from './monitoreo-software.constants';
import {
  FilaAula,
  FilaCategoria,
  FilaSoftware,
  RespuestaFiltros,
} from './monitoreo-software.types';
import { SoftrackerDbService } from '../softracker-db/softracker-db.service';

// Sentencias SQL de solo lectura. Son constantes a nivel de módulo: solo nombran
// las vistas `resumen_diario_uso` y `software_catalogo` y usan parámetros
// posicionales (`$1`); no concatenan valores provenientes de la petición.
const SQL_AULAS = `SELECT DISTINCT sala_codigo
FROM resumen_diario_uso
WHERE sala_codigo IS NOT NULL AND sala_codigo <> '';`;

const SQL_SOFTWARE = `SELECT DISTINCT id, nombre, categoria
FROM software_catalogo
WHERE estado = $1;`;

const SQL_CATEGORIAS = `SELECT DISTINCT categoria
FROM software_catalogo
WHERE estado = $1 AND categoria IS NOT NULL AND categoria <> '';`;

/**
 * Resuelve el endpoint `GET /monitoreo-software/filtros` con una caché mínima.
 *
 * La caché tiene una sola entrada, sin clave por usuario ni parámetro de
 * forzado (Req. 5.7). La entrada almacena la `Promise` en curso y se guarda de
 * forma síncrona antes de cualquier `await`, por lo que las solicitudes
 * simultáneas comparten la misma consulta (Req. 5.3). El `generadoEn` se fija
 * en el instante de la solicitud que originó la consulta y se conserva mientras
 * la entrada siga vigente (Req. 4.7).
 */
@Injectable()
export class MonitoreoSoftwareService {
  private cacheFiltros: {
    expiraEn: number;
    valor: Promise<RespuestaFiltros>;
  } | null = null;

  constructor(
    private readonly softracker: SoftrackerDbService,
    @Inject(RELOJ_MONITOREO) private readonly reloj: RelojMonitoreo,
  ) {}

  obtenerFiltros(): Promise<RespuestaFiltros> {
    const ahora = this.reloj();
    const entrada = this.cacheFiltros;
    if (entrada && entrada.expiraEn > ahora) return entrada.valor;

    const valor: Promise<RespuestaFiltros> = this.consultarFiltros(ahora).catch(
      (error: unknown) => {
        // Solo se borra si la entrada sigue siendo la de esta consulta.
        if (this.cacheFiltros?.valor === valor) this.cacheFiltros = null;
        throw error;
      },
    );
    this.cacheFiltros = { expiraEn: ahora + TTL_FILTROS_MS, valor };
    return valor;
  }

  private async consultarFiltros(ahora: number): Promise<RespuestaFiltros> {
    const generadoEn = new Date(ahora).toISOString();
    const [aulas, software, categorias] = await Promise.all([
      this.softracker.consultar<FilaAula>(SQL_AULAS, []),
      this.softracker.consultar<FilaSoftware>(SQL_SOFTWARE, [
        ESTADO_SOFTWARE_ACTIVO,
      ]),
      this.softracker.consultar<FilaCategoria>(SQL_CATEGORIAS, [
        ESTADO_SOFTWARE_ACTIVO,
      ]),
    ]);
    return construirRespuestaFiltros(
      { aulas, software, categorias },
      generadoEn,
    );
  }
}
