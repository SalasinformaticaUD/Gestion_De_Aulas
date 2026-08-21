import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoAula } from '../generated/prisma/enums.js';
import { AulasModule } from '../src/aulas/aulas.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';

describe('AulasController (e2e)', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const missingId = '00000000-0000-4000-8000-000000000002';
  let app: INestApplication<App>;
  let aulas: Array<Record<string, unknown>>;

  const prisma = {
    aula: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const aula = { id: aulaId, estado: EstadoAula.OPERATIVA, ...data };
        aulas.push(aula);
        return aula;
      }),
      findMany: jest.fn(async () => aulas),
      findUnique: jest.fn(
        async ({ where }: { where: { id: string } }) =>
          aulas.find((aula) => aula.id === where.id) ?? null,
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const aula = aulas.find((item) => item.id === where.id);
          Object.assign(aula!, data);
          return aula;
        },
      ),
      delete: jest.fn(),
    },
    proyectoCurricular: { findUnique: jest.fn() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AulasModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    aulas = [];
    jest.clearAllMocks();
  });

  it('crea, lista, consulta y actualiza un aula', async () => {
    await request(app.getHttpServer())
      .post('/aulas')
      .send({ codigo: 'LAB-01', ubicacion: 'Piso 2', capacidad: 25 })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe(aulaId);
        expect(body.codigo).toBe('LAB-01');
      });

    await request(app.getHttpServer())
      .get('/aulas')
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));

    await request(app.getHttpServer())
      .get(`/aulas/${aulaId}`)
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(aulaId));

    await request(app.getHttpServer())
      .patch(`/aulas/${aulaId}`)
      .send({ estado: EstadoAula.MANTENIMIENTO })
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe(EstadoAula.MANTENIMIENTO));
  });

  it('responde 404 para un UUID inexistente', () =>
    request(app.getHttpServer()).get(`/aulas/${missingId}`).expect(404));

  it('rechaza datos inválidos y campos no permitidos', () =>
    request(app.getHttpServer())
      .post('/aulas')
      .send({
        codigo: '',
        ubicacion: 'Piso 2',
        capacidad: 0,
        desconocido: true,
      })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
