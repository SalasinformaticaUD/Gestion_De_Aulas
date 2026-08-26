import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { configureApp } from '../src/configure-app';
import { MultasModule } from '../src/multas/multas.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MultasController (e2e)', () => {
  const estudiante = {
    id: '00000000-0000-4000-8000-000000000001',
    codigo: '20261001',
    nombre: 'Estudiante',
  };
  const motivo = { id: '00000000-0000-4000-8000-000000000002', nombre: 'Daño' };
  const multaId = '00000000-0000-4000-8000-000000000003';
  let app: INestApplication<App>;
  let multa: any;
  const incluir = () => ({
    ...multa,
    estudiante,
    motivo,
    impuestaPor: null,
    cumplidaPor: null,
    anuladaPor: null,
  });
  const prisma = {
    estudiante: { findFirst: jest.fn().mockResolvedValue(estudiante) },
    motivoMulta: { findUnique: jest.fn().mockResolvedValue(motivo) },
    multa: {
      create: jest.fn(({ data }) => {
        multa = {
          id: multaId,
          fecha: new Date(),
          estado: 'ACTIVA',
          ...data,
          cumplidaEn: null,
          anuladaEn: null,
        };
        return Promise.resolve(incluir());
      }),
      findUnique: jest.fn(() => Promise.resolve(multa ? incluir() : null)),
      findMany: jest.fn(() => Promise.resolve(multa ? [incluir()] : [])),
      update: jest.fn(({ data }) => {
        multa = { ...multa, ...data };
        return Promise.resolve(incluir());
      }),
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [MultasModule] })
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
    multa = null;
    jest.clearAllMocks();
  });
  it('crea, consulta y cumple una multa conservando su historial', async () => {
    await request(app.getHttpServer())
      .post('/multas')
      .send({
        codigoEstudiante: estudiante.codigo,
        motivoId: motivo.id,
        descripcion: 'Daño de equipo',
      })
      .expect(201)
      .expect(({ body }) => expect(body.estado).toBe('ACTIVA'));
    await request(app.getHttpServer())
      .get(`/multas/${multaId}`)
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe('ACTIVA'));
    await request(app.getHttpServer())
      .patch(`/multas/${multaId}/cumplir`)
      .send({ elementosEntregados: 'Cable HDMI' })
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe('CUMPLIDA'));
    await request(app.getHttpServer())
      .get(`/multas/${multaId}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({
            estado: 'CUMPLIDA',
            elementosEntregados: 'Cable HDMI',
          }),
        ),
      );
  });
});
