import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Pool, QueryResultRow } from 'pg';

import {
  construirConfigPool,
  MENSAJE_SOFTRACKER_ERROR_INTERNO,
  MENSAJE_SOFTRACKER_NO_DISPONIBLE,
  SOFTRACKER_POOL_FACTORY,
  type SoftrackerPoolFactory,
} from './softracker-db.constants';
import {
  esErrorDeDisponibilidad,
  sanitizarParaLog,
} from './softracker-db.errors';

/**
 * Acceso de solo lectura a la base de datos de Softracker con pool perezoso.
 *
 * El `pg.Pool` se crea en la primera invocación de `consultar`, nunca en el
 * arranque, de modo que el backend inicia aunque falte `SOFTRACKER_DATABASE_URL`
 * (Req. 1.4, 1.5). Los errores se clasifican en 503 (disponibilidad) o 500
 * (interno) y se registran saneados, sin exponer la cadena de conexión
 * (Req. 1.7, 1.8, 1.12). Al apagar, `onModuleDestroy` cierra el pool (Req. 1.10).
 */
@Injectable()
export class SoftrackerDbService implements OnModuleDestroy {
  private readonly logger = new Logger(SoftrackerDbService.name);
  private pool: Pool | null = null;
  private connectionString: string | null = null;

  constructor(
    @Inject(SOFTRACKER_POOL_FACTORY)
    private readonly crearPool: SoftrackerPoolFactory,
  ) {}

  async consultar<T extends QueryResultRow>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    const url = process.env.SOFTRACKER_DATABASE_URL;
    if (url === undefined || url.trim().length === 0) {
      throw new ServiceUnavailableException(MENSAJE_SOFTRACKER_NO_DISPONIBLE);
    }

    if (this.pool === null) {
      const urlRecortada = url.trim();
      this.connectionString = urlRecortada;
      this.pool = this.crearPool(construirConfigPool(urlRecortada));
      // Obligatorio: `pg.Pool` emite `error` cuando un cliente inactivo pierde
      // la conexión; sin listener Node termina el proceso.
      this.pool.on('error', (error) => {
        this.logger.error(sanitizarParaLog(error, this.connectionString));
      });
    }

    try {
      const resultado = await this.pool.query<T>(sql, [...params]);
      return resultado.rows;
    } catch (error) {
      this.logger.error(sanitizarParaLog(error, this.connectionString));

      if (error instanceof HttpException) {
        throw error;
      }
      if (esErrorDeDisponibilidad(error)) {
        throw new ServiceUnavailableException(MENSAJE_SOFTRACKER_NO_DISPONIBLE);
      }
      throw new InternalServerErrorException(MENSAJE_SOFTRACKER_ERROR_INTERNO);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool !== null) {
      try {
        await this.pool.end();
      } catch (error) {
        this.logger.error(sanitizarParaLog(error, this.connectionString));
      }
      this.pool = null;
    }
  }
}
