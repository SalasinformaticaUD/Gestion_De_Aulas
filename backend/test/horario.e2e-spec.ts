import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HorarioModule } from '../src/horario/horario.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { configureApp } from '../src/configure-app';
import { AuthService } from '../src/auth/auth.service';
import { attachTestAdministrator } from './helpers/authenticated-user';

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
    delete: jest.Mock;
  };
  aula: { findUnique: jest.Mock };
  docente: { findUnique: jest.Mock; upsert: jest.Mock };
  asignatura: { findUnique: jest.Mock; upsert: jest.Mock };
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
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const periodo = periodos.find((item) => item.id === where.id);
        return Promise.resolve(
          periodo
            ? {
                ...periodo,
                _count: {
                  clases: clases.filter(
                    (clase) => clase.periodoId === periodo.id,
                  ).length,
                },
              }
            : null,
        );
      }),
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
      delete: jest.fn(({ where }: { where: { id: string } }) => {
        const indice = periodos.findIndex((periodo) => periodo.id === where.id);
        const [eliminado] = periodos.splice(indice, 1);
        return Promise.resolve(eliminado);
      }),
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
      upsert: jest.fn(() =>
        Promise.resolve({
          id: '00000000-0000-4000-8000-000000000010',
        }),
      ),
    },
    asignatura: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id }),
      ),
      upsert: jest.fn(() =>
        Promise.resolve({
          id: '00000000-0000-4000-8000-000000000011',
        }),
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
            id?: { not: string };
          };
        }) =>
          Promise.resolve(
            clases.find(
              (clase) =>
                clase.id !== where.id?.not &&
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
      update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<ClaseRecord> }) => {
        const clase = clases.find((item) => item.id === where.id)!;
        Object.assign(clase, data);
        return Promise.resolve(clase);
      }),
      delete: jest.fn(({ where }: { where: { id: string } }) => {
        const indice = clases.findIndex((item) => item.id === where.id);
        const [eliminada] = clases.splice(indice, 1);
        return Promise.resolve(eliminada);
      }),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (callback: (tx: PrismaMock) => unknown) => {
      const periodosAntes = [...periodos];
      const clasesAntes = [...clases];
      try {
        return await callback(prisma);
      } catch (error: unknown) {
        periodos = periodosAntes;
        clases = clasesAntes;
        throw error;
      }
    },
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HorarioModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(AuditoriaService)
      .useValue({ registrar: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(AuthService)
      .useValue({ verifyCurrentPassword: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    attachTestAdministrator(app);
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    periodos = [];
    clases = [];
    siguienteClase = 0;
    jest.clearAllMocks();
  });

  it('completa el CRUD de un período académico', async () => {
    await request(app.getHttpServer())
      .post('/horario/periodos/iniciar-semestre')
      .send({
        nombre: '2026-3',
        fechaInicio: '2026-08-01',
        fechaFin: '2026-12-01',
        passwordConfirmacion: 'Clave-segura-2026',
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

    await request(app.getHttpServer())
      .get(`/horario/periodos/${periodoId}`)
      .expect(200)
      .expect(({ body }: { body: PeriodoRecord }) =>
        expect(body.id).toBe(periodoId),
      );

    await request(app.getHttpServer())
      .patch(`/horario/periodos/${periodoId}`)
      .send({ nombre: '2026-3 actualizado' })
      .expect(200)
      .expect(({ body }: { body: PeriodoRecord }) =>
        expect(body.nombre).toBe('2026-3 actualizado'),
      );

    await request(app.getHttpServer())
      .delete(`/horario/periodos/${periodoId}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/horario/periodos/${periodoId}`)
      .expect(404);
  });

  it('consulta, actualiza y elimina una clase programada', async () => {
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
      grupo: '020-81',
    });

    await request(app.getHttpServer())
      .get(`/horario/clases?periodoId=${periodoId}&diaSemana=1`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));

    await request(app.getHttpServer())
      .patch(`/horario/clases/${claseId}`)
      .send({ grupo: '020-82' })
      .expect(200)
      .expect(({ body }: { body: ClaseRecord }) =>
        expect(body.grupo).toBe('020-82'),
      );

    await request(app.getHttpServer())
      .delete(`/horario/clases/${claseId}`)
      .expect(200);
    expect(clases).toHaveLength(0);
  });

  it('rechaza la importacion oficial cuando no se adjunta el Excel', () =>
    request(app.getHttpServer())
      .post('/horario/importar/excel')
      .field('periodoId', periodoId)
      .expect(400));

  it('no expone las rutas antiguas de creación e importación JSON', async () => {
    await request(app.getHttpServer()).post('/horario/clases').send({}).expect(404);
    await request(app.getHttpServer()).post('/horario/importar').send({}).expect(404);
  });

  it('rechaza campos no permitidos mediante la validacion global', async () => {
    await request(app.getHttpServer())
      .post('/horario/periodos/iniciar-semestre')
      .send({
        nombre: '2026-3',
        fechaInicio: '2026-08-01',
        fechaFin: '2026-12-01',
        passwordConfirmacion: 'Clave-segura-2026',
        desconocido: true,
      })
      .expect(400);

    expect(prisma.periodoAcademico.create).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
