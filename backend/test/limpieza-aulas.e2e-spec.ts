import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { configureApp } from '../src/configure-app';
import { LimpiezaAulasModule } from '../src/limpieza-aulas/limpieza-aulas.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Limpieza = {
  id: string;
  aulaId: string;
  realizadaEn: Date;
  observacion: string | null;
  responsableId?: string;
};

type RespuestaLimpieza = Limpieza & {
  aula: { id: string; codigo: string; ubicacion: string };
};

describe('LimpiezaAulasController (e2e)', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const limpiezaId = '00000000-0000-4000-8000-000000000002';
  const aula = { id: aulaId, codigo: 'LAB-01', ubicacion: 'Piso 1' };
  let app: INestApplication<App>;
  let registros: Limpieza[];

  const incluir = (registro: Limpieza) => ({
    ...registro,
    responsable: null,
    aula,
  });
  const prisma = {
    aula: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === aulaId ? aula : null),
      ),
    },
    limpieza: {
      create: jest.fn(({ data }: { data: Omit<Limpieza, 'id'> }) => {
        const registro: Limpieza = { id: limpiezaId, ...data };
        registros.push(registro);
        return Promise.resolve(incluir(registro));
      }),
      findMany: jest.fn(({ where }: { where: Record<string, unknown> }) => {
        const fecha = where.realizadaEn as
          { gte?: Date; lte?: Date } | undefined;
        return Promise.resolve(
          registros
            .filter(
              (registro) =>
                (!where.aulaId || registro.aulaId === where.aulaId) &&
                (!fecha?.gte || registro.realizadaEn >= fecha.gte) &&
                (!fecha?.lte || registro.realizadaEn <= fecha.lte),
            )
            .map(incluir),
        );
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          registros.find((registro) => registro.id === where.id)
            ? incluir(registros.find((registro) => registro.id === where.id)!)
            : null,
        ),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Limpieza>;
        }) => {
          const registro = registros.find((item) => item.id === where.id)!;
          Object.assign(registro, data);
          return Promise.resolve(incluir(registro));
        },
      ),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LimpiezaAulasModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(AuditoriaService)
      .useValue({ registrar: jest.fn().mockResolvedValue(undefined) })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    registros = [];
    jest.clearAllMocks();
  });

  it('registra, filtra, consulta y actualiza una limpieza', async () => {
    await request(app.getHttpServer())
      .post('/limpieza-aulas')
      .send({
        aulaId,
        realizadaEn: '2026-08-26T08:00:00.000Z',
        observacion: 'Limpieza de estaciones',
      })
      .expect(201)
      .expect(({ body }: { body: RespuestaLimpieza }) => {
        expect(body.id).toBe(limpiezaId);
        expect(body.aula.codigo).toBe('LAB-01');
      });

    await request(app.getHttpServer())
      .get(`/limpieza-aulas?aulaId=${aulaId}&desde=2026-08-26&hasta=2026-08-26`)
      .expect(200)
      .expect(({ body }: { body: RespuestaLimpieza[] }) =>
        expect(body).toHaveLength(1),
      );

    await request(app.getHttpServer())
      .get(`/limpieza-aulas/${limpiezaId}`)
      .expect(200)
      .expect(({ body }: { body: RespuestaLimpieza }) =>
        expect(body.observacion).toBe('Limpieza de estaciones'),
      );

    await request(app.getHttpServer())
      .patch(`/limpieza-aulas/${limpiezaId}`)
      .send({ observacion: 'Limpieza profunda de estaciones' })
      .expect(200)
      .expect(({ body }: { body: RespuestaLimpieza }) =>
        expect(body.observacion).toBe('Limpieza profunda de estaciones'),
      );
  });

  it('valida el identificador de aula al registrar una limpieza', () =>
    request(app.getHttpServer())
      .post('/limpieza-aulas')
      .send({ aulaId: 'no-es-uuid' })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
