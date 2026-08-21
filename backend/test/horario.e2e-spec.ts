import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HorarioModule } from '../src/horario/horario.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';

type PeriodoRecord = {
  id: string;
  nombre?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  activo: boolean;
};

type ClaseRecord = {
  id: string;
  periodoId: string;
  aulaId: string;
  docenteId: string;
  asignaturaId: string;
  proyectoCurricularId: string | null;
  diaSemana: number;
  horaInicio: Date;
  horaFin: Date;
  grupo?: string;
  inscritos?: number;
};

type PrismaMock = {
  periodoAcademico: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  aula: { findUnique: jest.Mock };
  docente: { findUnique: jest.Mock };
  asignatura: { findUnique: jest.Mock };
  proyectoCurricular: { findUnique: jest.Mock };
  claseProgramada: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('HorarioController (e2e)', () => {
  const periodoId = '00000000-0000-4000-8000-000000000001';
  const aulaId = '00000000-0000-4000-8000-000000000002';
  const docenteId = '00000000-0000-4000-8000-000000000003';
  const asignaturaId = '00000000-0000-4000-8000-000000000004';
  const claseId = '00000000-0000-4000-8000-000000000005';
  let app: INestApplication<App>;
  let periodos: PeriodoRecord[];
  let clases: ClaseRecord[];
  let siguienteClase: number;

  const prisma: PrismaMock = {
    periodoAcademico: {
      create: jest.fn(
        ({
          data,
        }: {
          data: Omit<PeriodoRecord, 'id'>;
        }): Promise<PeriodoRecord> => {
          const periodo = { id: periodoId, ...data };
          periodos.push(periodo);
          return Promise.resolve(periodo);
        },
      ),
      findMany: jest.fn(() => Promise.resolve(periodos)),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(periodos.find((periodo) => periodo.id === where.id)),
      ),
      updateMany: jest.fn(({ data }: { data: { activo: boolean } }) => {
        periodos.forEach((periodo) => Object.assign(periodo, data));
        return Promise.resolve({ count: periodos.length });
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { activo: boolean };
        }) => {
          const periodo = periodos.find((item) => item.id === where.id)!;
          Object.assign(periodo, data);
          return Promise.resolve(periodo);
        },
      ),
    },
    aula: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id }),
      ),
    },
    docente: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id }),
      ),
    },
    asignatura: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id }),
      ),
    },
    proyectoCurricular: { findUnique: jest.fn() },
    claseProgramada: {
      findMany: jest.fn(() => Promise.resolve(clases)),
      findFirst: jest.fn(
        ({
          where,
        }: {
          where: {
            periodoId: string;
            aulaId: string;
            diaSemana: number;
            horaInicio: { lt: Date };
            horaFin: { gt: Date };
          };
        }) =>
          Promise.resolve(
            clases.find(
              (clase) =>
                clase.periodoId === where.periodoId &&
                clase.aulaId === where.aulaId &&
                clase.diaSemana === where.diaSemana &&
                clase.horaInicio < where.horaInicio.lt &&
                clase.horaFin > where.horaFin.gt,
            ),
          ),
      ),
      create: jest.fn(({ data }: { data: Omit<ClaseRecord, 'id'> }) => {
        const clase = {
          id:
            siguienteClase++ === 0
              ? claseId
              : '00000000-0000-4000-8000-000000000006',
          ...data,
        };
        clases.push(clase);
        return Promise.resolve(clase);
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(clases.find((clase) => clase.id === where.id)),
      ),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: PrismaMock) => unknown) => callback(prisma),
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HorarioModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    periodos = [];
    clases = [];
    siguienteClase = 0;
    jest.clearAllMocks();
  });

  it('crea y activa un período académico', async () => {
    await request(app.getHttpServer())
      .post('/horario/periodos')
      .send({
        nombre: '2026-3',
        fechaInicio: '2026-08-01',
        fechaFin: '2026-12-01',
      })
      .expect(201)
      .expect(({ body }: { body: PeriodoRecord }) =>
        expect(body.id).toBe(periodoId),
      );

    await request(app.getHttpServer())
      .patch(`/horario/periodos/${periodoId}/activar`)
      .expect(200)
      .expect(({ body }: { body: PeriodoRecord }) =>
        expect(body.activo).toBe(true),
      );
  });

  it('crea y consulta una clase programada', async () => {
    periodos.push({ id: periodoId, activo: true });

    await request(app.getHttpServer())
      .post('/horario/clases')
      .send({
        periodoId,
        aulaId,
        docenteId,
        asignaturaId,
        diaSemana: 1,
        horaInicio: '08:00',
        horaFin: '10:00',
        grupo: '020-81',
      })
      .expect(201)
      .expect(({ body }: { body: ClaseRecord }) =>
        expect(body.id).toBe(claseId),
      );

    await request(app.getHttpServer())
      .get(`/horario/clases?periodoId=${periodoId}&diaSemana=1`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
  });

  it('rechaza una clase solapada', async () => {
    periodos.push({ id: periodoId, activo: true });
    clases.push({
      id: claseId,
      periodoId,
      aulaId,
      docenteId,
      asignaturaId,
      proyectoCurricularId: null,
      diaSemana: 1,
      horaInicio: new Date('1970-01-01T08:00:00.000Z'),
      horaFin: new Date('1970-01-01T10:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .post('/horario/clases')
      .send({
        periodoId,
        aulaId,
        docenteId,
        asignaturaId,
        diaSemana: 1,
        horaInicio: '09:00',
        horaFin: '11:00',
        grupo: '020-82',
      })
      .expect(409);
  });

  afterAll(async () => {
    await app.close();
  });
});
