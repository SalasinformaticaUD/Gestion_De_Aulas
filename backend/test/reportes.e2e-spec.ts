import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReportesModule } from '../src/reportes/reportes.module';

describe('ReportesController (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    limpieza: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'registro',
          realizadaEn: new Date('2026-08-01'),
          observacion: 'Correcta',
          aula: { codigo: 'LAB-1', ubicacion: 'Edificio A' },
          responsable: null,
        },
      ]),
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [ReportesModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => app.close());

  it('entrega reporte JSON paginado y su exportación CSV', async () => {
    await request(app.getHttpServer())
      .get(
        '/reportes/limpieza?desde=2026-08-01&hasta=2026-08-02&pagina=1&limite=10',
      )
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({
            reporte: 'limpieza',
            total: 1,
            items: [expect.objectContaining({ aula: 'LAB-1' })],
          }),
        ),
      );
    await request(app.getHttpServer())
      .get('/reportes/limpieza/csv?desde=2026-08-01&hasta=2026-08-02')
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect((response) => expect(response.text).toContain('LAB-1'));
  });

  it('valida el rango solicitado', () =>
    request(app.getHttpServer())
      .get('/reportes/limpieza?desde=2026-08-03&hasta=2026-08-02')
      .expect(400));
});
