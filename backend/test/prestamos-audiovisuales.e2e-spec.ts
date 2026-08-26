import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { configureApp } from '../src/configure-app';
import { PrestamosAudiovisualesModule } from '../src/prestamos-audiovisuales/prestamos-audiovisuales.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PrestamosAudiovisualesController (e2e)', () => {
  const ids = {
    docente: '00000000-0000-4000-8000-000000000001',
    aula: '00000000-0000-4000-8000-000000000002',
    equipo: '00000000-0000-4000-8000-000000000003',
    prestamo: '00000000-0000-4000-8000-000000000004',
  };
  let app: INestApplication<App>;
  let equipo: any;
  let prestamo: any;
  const tx: any = {
    docente: {
      findUnique: jest.fn(() => Promise.resolve({ id: ids.docente })),
    },
    aula: { findUnique: jest.fn(() => Promise.resolve({ id: ids.aula })) },
    equipoAudiovisual: {
      create: jest.fn(({ data }) => {
        equipo = { id: ids.equipo, estado: 'DISPONIBLE', ...data };
        return Promise.resolve(equipo);
      }),
      findMany: jest.fn(() => Promise.resolve(equipo ? [equipo] : [])),
      updateMany: jest.fn(({ data }) => {
        equipo = { ...equipo, ...data };
        return Promise.resolve({ count: 1 });
      }),
    },
    prestamoAudiovisual: {
      create: jest.fn(({ data }) => {
        prestamo = {
          id: ids.prestamo,
          estado: 'ACTIVO',
          ...data,
          detalles: [{ equipoId: ids.equipo }],
        };
        return Promise.resolve(prestamo);
      }),
      findUnique: jest.fn(() => Promise.resolve(prestamo)),
      update: jest.fn(({ data }) => {
        prestamo = { ...prestamo, ...data };
        return Promise.resolve(prestamo);
      }),
    },
    detallePrestamoAudiovisual: { update: jest.fn(() => Promise.resolve({})) },
    usuario: { findUnique: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn((callback) => callback(tx)) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PrestamosAudiovisualesModule],
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
    equipo = null;
    prestamo = null;
    jest.clearAllMocks();
  });
  it('crea equipo, lo presta y registra su devolución', async () => {
    await request(app.getHttpServer())
      .post('/prestamos-audiovisuales/equipos')
      .send({
        codigoInventario: 'AV-1',
        nombre: 'Video beam',
        tipo: 'PROYECTOR',
      })
      .expect(201)
      .expect(({ body }) => expect(body.estado).toBe('DISPONIBLE'));
    await request(app.getHttpServer())
      .post('/prestamos-audiovisuales')
      .send({
        docenteId: ids.docente,
        aulaId: ids.aula,
        salidaEn: '2026-08-20T08:00:00.000Z',
        devolucionEstimada: '2026-08-20T10:00:00.000Z',
        equipos: [
          {
            equipoId: ids.equipo,
            estadoFisicoSalida: 'BUENO',
            estadoFuncionalSalida: 'DISPONIBLE',
          },
        ],
      })
      .expect(201)
      .expect(({ body }) => expect(body.estado).toBe('ACTIVO'));
    await request(app.getHttpServer())
      .patch(`/prestamos-audiovisuales/${ids.prestamo}/devolver`)
      .send({
        devolucionReal: '2026-08-20T09:00:00.000Z',
        equipos: [
          {
            equipoId: ids.equipo,
            estadoFisicoDevolucion: 'BUENO',
            estadoFuncionalDevolucion: 'DISPONIBLE',
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe('DEVUELTO'));
    expect(equipo.estado).toBe('DISPONIBLE');
  });
});
