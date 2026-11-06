import { Global, Module } from '@nestjs/common';

import {
  crearPoolPg,
  SOFTRACKER_POOL_FACTORY,
} from './softracker-db.constants';
import { SoftrackerDbService } from './softracker-db.service';

/**
 * Módulo global que expone `SoftrackerDbService` a toda la aplicación (Req. 1.1,
 * 1.3). Se importa una sola vez en `AppModule`.
 */
@Global()
@Module({
  providers: [
    SoftrackerDbService,
    { provide: SOFTRACKER_POOL_FACTORY, useValue: crearPoolPg },
  ],
  exports: [SoftrackerDbService],
})
export class SoftrackerDbModule {}
