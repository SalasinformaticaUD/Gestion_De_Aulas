import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoAsistencia } from '../generated/prisma/enums.js';
import { AsistenciaDocenteModule } from '../src/asistencia-docente/asistencia-docente.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';

type AsistenciaRecord = {
  id: string;
  claseId: string;
  fecha: Date;
  estado: EstadoAsistencia;
  registradaEn: Date | null;
  registradoPorId?: string;
  observacion?: string;
};

type PrismaMock = {
  asistenciaDocente: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  claseProgramada: { findUnique: jest.Mock };
  usuario: { findUnique: jest.Mock };
};

describe('AsistenciaDocenteController (e2e)', () => {
  const claseId = '00000000-0000-4000-8000-000000000001';
  const asistenciaId = '00000000-0000-4000-8000-000000000002';
  let app: INestApplication<App>;
  let asistencias: AsistenciaRecord[];

  const prisma: PrismaMock = {
    asistenciaDocente: {
      findUnique: jest.fn(
        ({
          where,
        }: {
          where: {
            id?: string;
            claseId_fecha?: { claseId: string; fecha: Date };
          };
        }) => {
          if (where.id) {
            return Promise.resolve(
              asistencias.find((asistencia) => asistencia.id === where.id),
            );
          }
          const key = where.claseId_fecha!;
          return Promise.resolve(
            asistencias.find(
              (asistencia) =>
                asistencia.claseId === key.claseId &&
                asistencia.fecha.getTime() === key.fecha.getTime(),
            ),
          );
        },
      ),
      create: jest.fn(({ data }: { data: Omit<AsistenciaRecord, 'id'> }) => {
        const asistencia = { id: asistenciaId, ...data };
        asistencias.push(asistencia);
        return Promise.resolve(asistencia);
      }),
      findMany: jest.fn(({ where }: { where: { claseId?: string } }) =>
        Promise.resolve(
          where.claseId
            ? asistencias.filter(
                (asistencia) => asistencia.claseId === where.claseId,
              )
            : asistencias,
        ),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<AsistenciaRecord>;
        }) => {
          const asistencia = asistencias.find((item) => item.id === where.id)!;
          Object.assign(asistencia, data);
          return Promise.resolve(asistencia);
        },
      ),
    },
    claseProgramada: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === claseId ? { id: claseId } : null),
      ),
    },
    usuario: { findUnique: jest.fn() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AsistenciaDocenteModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    asistencias = [];
    jest.clearAllMocks();
  });

  it('registra y consulta la asistencia de una clase', async () => {
    await request(app.getHttpServer())
      .post('/asistencia-docente')
      .send({ claseId, fecha: '2026-08-20' })
      .expect(201)
      .expect(({ body }: { body: AsistenciaRecord }) => {
        expect(body.id).toBe(asistenciaId);
        expect(body.estado).toBe(EstadoAsistencia.PENDIENTE);
      });

    await request(app.getHttpServer())
      .get(`/asistencia-docente/clase/${claseId}`)
      .expect(200)
      .expect(({ body }: { body: AsistenciaRecord[] }) =>
        expect(body).toHaveLength(1),
      );
  });

  it('rechaza un registro duplicado para la misma clase y fecha', async () => {
    asistencias.push({
      id: asistenciaId,
      claseId,
      fecha: new Date('2026-08-20T00:00:00.000Z'),
      estado: EstadoAsistencia.PENDIENTE,
      registradaEn: null,
    });

    await request(app.getHttpServer())
      .post('/asistencia-docente')
      .send({ claseId, fecha: '2026-08-20' })
      .expect(409);
  });

  it('actualiza el estado y rechaza datos inválidos', async () => {
    asistencias.push({
      id: asistenciaId,
      claseId,
      fecha: new Date('2026-08-20T00:00:00.000Z'),
      estado: EstadoAsistencia.PENDIENTE,
      registradaEn: null,
    });

    await request(app.getHttpServer())
      .patch(`/asistencia-docente/${asistenciaId}`)
      .send({ estado: EstadoAsistencia.ASISTIO })
      .expect(200)
      .expect(({ body }: { body: AsistenciaRecord }) =>
        expect(body.estado).toBe(EstadoAsistencia.ASISTIO),
      );

    await request(app.getHttpServer())
      .post('/asistencia-docente')
      .send({ claseId: 'invalido', fecha: '20/08/2026' })
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
