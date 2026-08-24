import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { configureApp } from '../src/configure-app';
import { IntegracionesModule } from '../src/integraciones/integraciones.module';
import { MonitoresClientService } from '../src/integraciones/monitores-client.service';
import { MonitoresProvisioningService } from '../src/integraciones/monitores-provisioning.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Integraciones Monitores (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.AUTH_REQUIRED = 'false';
    process.env.PERMISSIONS_MODE = 'permissive';
    process.env.MONITORES_SERVICE_TOKEN = 'test-service-token';
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
      .overrideProvider(MonitoresProvisioningService)
      .useValue({
        provision: jest.fn().mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          creado: true,
          estado: 'INACTIVA',
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

  it('provisiona una identidad solo con el secreto de servicio de Monitores', async () => {
    const body = {
      nombreCompleto: 'Monitor de Prueba',
      nombreUsuario: 'monitor.prueba',
      correo: 'monitor.prueba@udistrital.edu.co',
    };
    await request(app.getHttpServer())
      .post('/integraciones/monitores/usuarios')
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .post('/integraciones/monitores/usuarios')
      .set('x-monitores-service-token', 'test-service-token')
      .send(body)
      .expect(201)
      .expect({
        id: '11111111-1111-4111-8111-111111111111',
        creado: true,
        estado: 'INACTIVA',
      });
  });

  afterAll(async () => {
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
    delete process.env.MONITORES_SERVICE_TOKEN;
    if (app) await app.close();
  });
});
