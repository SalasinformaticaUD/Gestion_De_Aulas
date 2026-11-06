import type { PoolConfig } from 'pg';
import { Pool } from 'pg';

export const SOFTRACKER_POOL_FACTORY = Symbol('SOFTRACKER_POOL_FACTORY');
export type SoftrackerPoolFactory = (config: PoolConfig) => Pool;
export const crearPoolPg: SoftrackerPoolFactory = (config) => new Pool(config);

export const MENSAJE_SOFTRACKER_NO_DISPONIBLE =
  'El servicio de monitoreo de software no está disponible en este momento.';
export const MENSAJE_SOFTRACKER_ERROR_INTERNO =
  'No fue posible completar la consulta de monitoreo de software.';

/** Configuración fija del pool (Req. 1.2 y 1.11). */
export function construirConfigPool(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: 'gestion-aulas',
    options: '-c default_transaction_read_only=on',
  };
}
