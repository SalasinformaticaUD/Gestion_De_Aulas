import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { TareasOperativasModule } from '../src/tareas-operativas/tareas-operativas.module';
import { TareasOperativasService } from '../src/tareas-operativas/tareas-operativas.service';

describe('TareasOperativasController (e2e)', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const tareaId = '00000000-0000-4000-8000-000000000002';
  let app: INestApplication<App>;
  let tarea: any;
  const prisma = {
    aula: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          where.id === aulaId ? { id: aulaId, codigo: 'LAB-1' } : null,
        ),
      ),
    },
    usuario: { findUnique: jest.fn() },
    tarea: {
      create: jest.fn(({ data }) => {
        tarea = {
          id: tareaId,
          estado: 'PENDIENTE',
          ...data,
          aula: { id: aulaId },
          responsable: null,
        };
        return Promise.resolve(tarea);
      }),
      findUnique: jest.fn(() => Promise.resolve(tarea)),
      findMany: jest.fn(({ where }) =>
        Promise.resolve(tarea && where.aulaId === aulaId ? [tarea] : []),
      ),
      update: jest.fn(),
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TareasOperativasModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(AuditoriaService)
      .useValue({ registrar: jest.fn() })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    tarea = null;
    jest.clearAllMocks();
  });
  it('crea una tarea bloqueante y la expone para el cálculo de disponibilidad', async () => {
    await request(app.getHttpServer())
      .post('/tareas-operativas')
      .send({
        aulaId,
        titulo: 'Mantenimiento',
        afectaDisponibilidad: true,
        inicio: '2026-08-26T08:00:00.000Z',
        fin: '2026-08-26T10:00:00.000Z',
      })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ afectaDisponibilidad: true, aulaId }),
        ),
      );
    const respuesta = await request(app.getHttpServer())
      .get(`/tareas-operativas?aulaId=${aulaId}&fecha=2026-08-26`)
      .expect(200);
    expect(respuesta.body).toEqual([
      expect.objectContaining({ id: tareaId, afectaDisponibilidad: true }),
    ]);
    const servicio = new TareasOperativasService(
      prisma as never,
      {
        registrar: jest.fn(),
      } as never,
    );
    await expect(
      servicio.findTareasQueAfectanDisponibilidad(
        aulaId,
        new Date('2026-08-26T08:00:00.000Z'),
        new Date('2026-08-26T10:00:00.000Z'),
      ),
    ).resolves.toHaveLength(1);
  });
});
