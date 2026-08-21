import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { configureApp } from '../src/configure-app';
import { IntegracionesModule } from '../src/integraciones/integraciones.module';
import { MonitoresClientService } from '../src/integraciones/monitores-client.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Integraciones Monitores (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.AUTH_REQUIRED = 'false';
    process.env.PERMISSIONS_MODE = 'permissive';
    const module = await Test.createTestingModule({
      imports: [AuthModule, IntegracionesModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MonitoresClientService)
      .useValue({
        estado: jest.fn().mockResolvedValue({
          disponible: true,
          servicio: 'monitores',
          detalle: 'ok',
        }),
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('expone el estado mediante un cliente de Monitores simulado', () =>
    request(app.getHttpServer())
      .get('/integraciones/monitores/estado')
      .expect(200)
      .expect({ disponible: true, servicio: 'monitores', detalle: 'ok' }));

  afterAll(async () => {
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
    if (app) await app.close();
  });
});
