import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { TipoObservacion } from '../generated/prisma/enums.js';
import { configureApp } from '../src/configure-app';
import { ObservacionesModule } from '../src/observaciones/observaciones.module';
import { PrismaService } from '../src/prisma/prisma.service';

type ObservacionRecord = {
  id: string;
  aulaId: string;
  tipo: TipoObservacion;
  contenido: string;
  vigenteHasta: Date | null;
  creadoEn: Date;
};

describe('ObservacionesController (e2e)', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const observacionId = '00000000-0000-4000-8000-000000000002';
  const aula = { id: aulaId, codigo: 'LAB-01' };
  let app: INestApplication<App>;
  let observaciones: ObservacionRecord[];

  const prisma = {
    aula: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === aulaId ? aula : null),
      ),
    },
    observacion: {
      create: jest.fn(
        ({ data }: { data: Omit<ObservacionRecord, 'id' | 'creadoEn'> }) => {
          const observacion = {
            id: observacionId,
            creadoEn: new Date(),
            ...data,
          };
          observaciones.push(observacion);
          return Promise.resolve({ ...observacion, aula });
        },
      ),
      findMany: jest.fn(({ where }: { where: Record<string, unknown> }) => {
        const ahora = new Date();
        return Promise.resolve(
          observaciones.filter(
            (item) =>
              (!where.aulaId || item.aulaId === where.aulaId) &&
              (!where.tipo || item.tipo === where.tipo) &&
              (!where.OR ||
                item.vigenteHasta === null ||
                item.vigenteHasta > ahora),
          ),
        );
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          observaciones.find((item) => item.id === where.id) ?? null,
        ),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<ObservacionRecord>;
        }) => {
          const observacion = observaciones.find(
            (item) => item.id === where.id,
          )!;
          Object.assign(observacion, data);
          return Promise.resolve({ ...observacion, aula });
        },
      ),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ObservacionesModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    observaciones = [];
    jest.clearAllMocks();
  });

  it('crea, consulta y cierra logicamente una restriccion por aula', async () => {
    await request(app.getHttpServer())
      .post('/observaciones')
      .send({
        aulaId,
        tipo: TipoObservacion.RESTRICCION,
        contenido: 'Mantenimiento de red',
        vigenteHasta: '2099-08-22T15:00:00.000Z',
      })
      .expect(201)
      .expect(({ body }: { body: ObservacionRecord }) => {
        expect(body.id).toBe(observacionId);
        expect(body.tipo).toBe(TipoObservacion.RESTRICCION);
      });

    await request(app.getHttpServer())
      .get(`/observaciones?aulaId=${aulaId}&tipo=RESTRICCION&vigentes=true`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));

    await request(app.getHttpServer())
      .delete(`/observaciones/${observacionId}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/observaciones?aulaId=${aulaId}&vigentes=true`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(0));
  });

  it('rechaza una observacion semanal sin vigencia', () =>
    request(app.getHttpServer())
      .post('/observaciones')
      .send({
        aulaId,
        tipo: TipoObservacion.SEMANAL,
        contenido: 'Uso limitado durante la semana',
      })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
