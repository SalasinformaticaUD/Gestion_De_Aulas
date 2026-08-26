import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoAula, EstadoPrestamo } from '../generated/prisma/enums.js';
import { configureApp } from '../src/configure-app';
import { DisponibilidadAulasModule } from '../src/disponibilidad-aulas/disponibilidad-aulas.module';
import { PrismaService } from '../src/prisma/prisma.service';

type PrismaMock = {
  aula: { findMany: jest.Mock; findUnique: jest.Mock };
  observacion: { findFirst: jest.Mock; findMany: jest.Mock };
  claseProgramada: { findFirst: jest.Mock };
  prestamoDocente: { findFirst: jest.Mock };
  practicaLibre: { findFirst: jest.Mock };
  tarea: { findFirst: jest.Mock };
  limpieza: { findFirst: jest.Mock };
};

describe('DisponibilidadAulasController (e2e)', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const aula = {
    id: aulaId,
    codigo: 'LAB-01',
    ubicacion: 'Piso 2',
    capacidad: 25,
    estado: EstadoAula.OPERATIVA,
  };
  const prisma: PrismaMock = {
    aula: { findMany: jest.fn(), findUnique: jest.fn() },
    observacion: { findFirst: jest.fn(), findMany: jest.fn() },
    claseProgramada: { findFirst: jest.fn() },
    prestamoDocente: { findFirst: jest.fn() },
    practicaLibre: { findFirst: jest.fn() },
    tarea: { findFirst: jest.fn() },
    limpieza: { findFirst: jest.fn() },
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DisponibilidadAulasModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aula.findMany.mockResolvedValue([aula]);
    prisma.aula.findUnique.mockResolvedValue(aula);
    prisma.observacion.findFirst.mockResolvedValue(null);
    prisma.observacion.findMany.mockResolvedValue([]);
    prisma.claseProgramada.findFirst.mockResolvedValue(null);
    prisma.prestamoDocente.findFirst.mockResolvedValue(null);
    prisma.practicaLibre.findFirst.mockResolvedValue(null);
    prisma.tarea.findFirst.mockResolvedValue(null);
    prisma.limpieza.findFirst.mockResolvedValue(null);
  });

  it('consulta todas las salas para un bloque de dos horas', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/disponibilidad-aulas?fecha=2026-08-20&horaInicio=08:00&horaFin=10:00',
      )
      .expect(200);
    const body = response.body as unknown as Array<{
      estadoCalculado: string;
      persistido: boolean;
    }>;

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      aula: {
        id: aulaId,
        codigo: 'LAB-01',
        ubicacion: 'Piso 2',
        capacidad: 25,
        estado: EstadoAula.OPERATIVA,
      },
      bloque: {
        fecha: '2026-08-20',
        horaInicio: '08:00',
        horaFin: '10:00',
        duracionHoras: 2,
      },
      estadoCalculado: 'disponible',
      motivo: 'No existen actividades ni restricciones para el bloque.',
      bloqueActual: null,
      siguienteActividad: null,
      fuentes: [],
      // Jest expone este matcher asimétrico con tipo público `any`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      calculadoEn: expect.any(String),
      persistido: false,
    });
  });

  it('consulta una sala sin exponer endpoints de escritura', async () => {
    await request(app.getHttpServer())
      .get(
        `/disponibilidad-aulas/${aulaId}?fecha=2026-08-20&horaInicio=08:00&horaFin=10:00`,
      )
      .expect(200)
      .expect(({ body }: { body: { persistido: boolean } }) =>
        expect(body.persistido).toBe(false),
      );

    await request(app.getHttpServer())
      .post('/disponibilidad-aulas')
      .send({})
      .expect(404);
  });

  it('mantiene la prioridad de clase sobre préstamo docente', async () => {
    prisma.claseProgramada.findFirst.mockResolvedValueOnce({
      id: 'clase-id',
      grupo: '020-81',
      docente: { nombre: 'Docente Uno' },
      asignatura: { nombre: 'Programación' },
      asistencias: [],
    });
    prisma.prestamoDocente.findFirst.mockResolvedValueOnce({
      id: 'prestamo-id',
      inicio: new Date('2026-08-20T13:00:00.000Z'),
      fin: new Date('2026-08-20T15:00:00.000Z'),
      estado: EstadoPrestamo.APROBADO,
      motivo: 'Reunión docente',
      docente: { nombre: 'Docente Dos' },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/disponibilidad-aulas/${aulaId}?fecha=2026-08-20&horaInicio=08:00&horaFin=10:00`,
      )
      .expect(200);
    const body = response.body as unknown as {
      estadoCalculado: string;
      fuentes: Array<{ tipo: string }>;
    };

    expect(body.estadoCalculado).toBe('ocupada');
    expect(body.fuentes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'clase-programada' }),
        expect.objectContaining({ tipo: 'prestamo-docente' }),
      ]),
    );
  });

  it('consulta el resumen del rango operativo diario', async () => {
    prisma.aula.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/disponibilidad-aulas/resumen-dia?fecha=2026-08-20')
      .expect(200);
    const body = response.body as unknown as {
      bloques: unknown[];
      [key: string]: unknown;
    };

    expect(body).toMatchObject({
      fecha: '2026-08-20',
      rangoOperativo: {
        horaInicio: '06:00',
        horaFin: '22:00',
        duracionBloqueHoras: 2,
      },
      persistido: false,
    });
    expect(body.bloques).toHaveLength(8);
  });

  it('rechaza bloques con formato inválido usando el error global', () =>
    request(app.getHttpServer())
      .get(
        '/disponibilidad-aulas?fecha=2026-08-20&horaInicio=09:30&horaFin=11:30',
      )
      .expect(400)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          path: '/disponibilidad-aulas?fecha=2026-08-20&horaInicio=09:30&horaFin=11:30',
        });
        expect(body.message).toEqual(expect.any(Array));
        expect(body.timestamp).toEqual(expect.any(String));
      }));

  it('rechaza parametros no permitidos mediante la validacion global', async () => {
    await request(app.getHttpServer())
      .get(
        '/disponibilidad-aulas?fecha=2026-08-20&horaInicio=08:00&horaFin=10:00&desconocido=true',
      )
      .expect(400);

    expect(prisma.aula.findMany).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
