import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoPrestamo } from '../generated/prisma/enums.js';
import { configureApp } from '../src/configure-app';
import { DisponibilidadAulasService } from '../src/disponibilidad-aulas/disponibilidad-aulas.service';
import { PracticasLibresModule } from '../src/practicas-libres/practicas-libres.module';
import { PrismaService } from '../src/prisma/prisma.service';

type EstudianteRecord = {
  id: string;
  codigo: string;
  nombre: string;
  correo?: string;
};

type PracticaRecord = {
  id: string;
  estudianteId: string;
  aulaId: string;
  inicio: Date;
  finEstimada: Date | null;
  finReal: Date | null;
  estado: EstadoPrestamo;
};

type PracticaCreateData = Omit<PracticaRecord, 'id' | 'finReal'>;

describe('PracticasLibresController (e2e)', () => {
  const practicaId = '00000000-0000-4000-8000-000000000010';
  const estudianteId = '00000000-0000-4000-8000-000000000011';
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const aula = {
    id: aulaId,
    codigo: 'LAB-01',
    ubicacion: 'Piso 2',
    capacidad: 25,
    estado: 'OPERATIVA',
  };
  let app: INestApplication<App>;
  let estudiantes: EstudianteRecord[];
  let practicas: PracticaRecord[];

  function conDetalle(practica: PracticaRecord) {
    return {
      ...practica,
      estudiante: estudiantes.find(
        (estudiante) => estudiante.id === practica.estudianteId,
      ),
      aula,
    };
  }

  const estudianteRepository = {
    findUnique: jest.fn(({ where }: { where: { codigo: string } }) =>
      Promise.resolve(
        estudiantes.find((estudiante) => estudiante.codigo === where.codigo) ??
          null,
      ),
    ),
    create: jest.fn(({ data }: { data: Omit<EstudianteRecord, 'id'> }) => {
      const estudiante = { id: estudianteId, ...data };
      estudiantes.push(estudiante);
      return Promise.resolve(estudiante);
    }),
  };

  const practicaRepository = {
    create: jest.fn(({ data }: { data: PracticaCreateData }) => {
      const practica: PracticaRecord = {
        id: practicaId,
        ...data,
        finReal: null,
      };
      practicas.push(practica);
      return Promise.resolve(conDetalle(practica));
    }),
    findMany: jest.fn(
      ({
        where,
      }: {
        where: {
          estado?: EstadoPrestamo;
          aulaId?: string;
          inicio?: { gte: Date; lte: Date };
        };
      }) =>
        Promise.resolve(
          practicas
            .filter(
              (practica) =>
                (!where.estado || practica.estado === where.estado) &&
                (!where.aulaId || practica.aulaId === where.aulaId) &&
                (!where.inicio ||
                  (practica.inicio >= where.inicio.gte &&
                    practica.inicio <= where.inicio.lte)),
            )
            .map(conDetalle),
        ),
    ),
    findUnique: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        practicas.find((practica) => practica.id === where.id) ?? null,
      ),
    ),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<PracticaRecord>;
      }) => {
        const practica = practicas.find((item) => item.id === where.id)!;
        Object.assign(practica, data);
        return Promise.resolve(conDetalle(practica));
      },
    ),
    updateMany: jest.fn(
      ({
        where,
        data,
      }: {
        where: {
          estado: EstadoPrestamo;
          finReal: null;
          finEstimada: { lt: Date };
        };
        data: { estado: EstadoPrestamo };
      }) => {
        let count = 0;
        practicas.forEach((practica) => {
          if (
            practica.estado === where.estado &&
            practica.finReal === where.finReal &&
            practica.finEstimada !== null &&
            practica.finEstimada < where.finEstimada.lt
          ) {
            practica.estado = data.estado;
            count += 1;
          }
        });
        return Promise.resolve({ count });
      },
    ),
  };

  const tx = {
    estudiante: estudianteRepository,
    multa: { findFirst: jest.fn().mockResolvedValue(null) },
    practicaLibre: practicaRepository,
  };

  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    estudiante: estudianteRepository,
    practicaLibre: practicaRepository,
  };

  const disponibilidad = {
    findOne: jest.fn().mockResolvedValue({
      estadoCalculado: 'disponible',
      motivo: 'No existen actividades ni restricciones para el bloque.',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PracticasLibresModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(DisponibilidadAulasService)
      .useValue(disponibilidad)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    estudiantes = [];
    practicas = [];
    jest.clearAllMocks();
    tx.multa.findFirst.mockResolvedValue(null);
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'disponible',
      motivo: 'No existen actividades ni restricciones para el bloque.',
    });
  });

  const crearPractica = (
    inicio = '2099-08-20T08:00:00-05:00',
    finEstimada = '2099-08-20T10:00:00-05:00',
  ) =>
    request(app.getHttpServer()).post('/practicas-libres').send({
      codigoEstudiante: '20261001',
      nombreEstudiante: 'Estudiante Uno',
      aulaId,
      inicio,
      finEstimada,
    });

  it('completa el flujo crear, consultar y finalizar una práctica', async () => {
    await crearPractica()
      .expect(201)
      .expect(({ body }: { body: PracticaRecord }) => {
        expect(body.id).toBe(practicaId);
        expect(body.estado).toBe(EstadoPrestamo.ACTIVO);
      });

    await request(app.getHttpServer())
      .get('/practicas-libres?estado=ACTIVO&fecha=2099-08-20')
      .expect(200)
      .expect(({ body }: { body: PracticaRecord[] }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(practicaId);
      });

    await request(app.getHttpServer())
      .patch(`/practicas-libres/${practicaId}/finalizar`)
      .send({ finReal: '2099-08-20T09:45:00-05:00' })
      .expect(200)
      .expect(({ body }: { body: PracticaRecord }) => {
        expect(body.estado).toBe(EstadoPrestamo.DEVUELTO);
        expect(body.finReal).toBe('2099-08-20T14:45:00.000Z');
      });

    await request(app.getHttpServer())
      .get('/practicas-libres?estado=ACTIVO&fecha=2099-08-20')
      .expect(200)
      .expect(({ body }: { body: PracticaRecord[] }) =>
        expect(body).toHaveLength(0),
      );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(disponibilidad.findOne).toHaveBeenCalledWith(aulaId, {
      fecha: '2099-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
  });

  it('consulta el estudiante creado y valida el código recibido', async () => {
    await crearPractica().expect(201);

    await request(app.getHttpServer())
      .get('/practicas-libres/estudiantes/20261001')
      .expect(200)
      .expect(({ body }: { body: EstudianteRecord }) =>
        expect(body.codigo).toBe('20261001'),
      );

    await request(app.getHttpServer())
      .get('/practicas-libres/estudiantes/x')
      .expect(400);
    await request(app.getHttpServer())
      .get('/practicas-libres/estudiantes/99999999')
      .expect(404);
  });

  it('cancela una práctica activa y permite consultarla como cancelada', async () => {
    await crearPractica().expect(201);

    await request(app.getHttpServer())
      .patch(`/practicas-libres/${practicaId}/cancelar`)
      .expect(200)
      .expect(({ body }: { body: PracticaRecord }) => {
        expect(body.estado).toBe(EstadoPrestamo.CANCELADO);
        expect(body.finReal).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get('/practicas-libres?estado=CANCELADO&fecha=2099-08-20')
      .expect(200)
      .expect(({ body }: { body: PracticaRecord[] }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(practicaId);
      });
  });

  it('persiste y permite consultar el estado VENCIDO', async () => {
    await crearPractica(
      '2026-08-19T08:00:00-05:00',
      '2026-08-19T10:00:00-05:00',
    ).expect(201);

    await request(app.getHttpServer())
      .get('/practicas-libres?estado=VENCIDO&fecha=2026-08-19')
      .expect(200)
      .expect(({ body }: { body: PracticaRecord[] }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: practicaId,
          estado: EstadoPrestamo.VENCIDO,
          finReal: null,
        });
      });
  });

  it('rechaza campos no definidos por el contrato', () =>
    request(app.getHttpServer())
      .post('/practicas-libres')
      .send({
        codigoEstudiante: '20261001',
        nombreEstudiante: 'Estudiante Uno',
        aulaId,
        inicio: '2026-08-20T08:00:00-05:00',
        finEstimada: '2026-08-20T10:00:00-05:00',
        estado: EstadoPrestamo.DEVUELTO,
      })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
