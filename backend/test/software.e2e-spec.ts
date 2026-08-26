import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { SoftwareModule } from '../src/software/software.module';

describe('SoftwareController (e2e)', () => {
  const aula = { id: '00000000-0000-4000-8000-000000000001', codigo: 'LAB-1' };
  const softwareId = '00000000-0000-4000-8000-000000000002';
  let app: INestApplication<App>;
  let software: {
    id: string;
    nombre: string;
    version: string;
    descripcion: string | null;
  } | null = null;
  const prisma = {
    software: {
      create: jest.fn(({ data }) => {
        software = {
          id: softwareId,
          ...data,
          descripcion: data.descripcion ?? null,
        };
        return Promise.resolve(software);
      }),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(where.id === softwareId ? software : null),
      ),
      upsert: jest.fn(({ create }) => {
        software = {
          id: softwareId,
          ...create,
          descripcion: create.descripcion ?? null,
        };
        return Promise.resolve(software);
      }),
    },
    aula: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(where.id === aula.id ? aula : null),
      ),
    },
    aulaSoftware: {
      create: jest.fn(({ data }) =>
        Promise.resolve({ ...data, aula, software }),
      ),
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [SoftwareModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    software = null;
    jest.clearAllMocks();
  });

  it('crea software y lo asocia a un aula existente', async () => {
    const creado = await request(app.getHttpServer())
      .post('/software')
      .send({ nombre: 'MATLAB', version: '2026.1', descripcion: 'Cálculo' })
      .expect(201);
    expect(creado.body).toEqual(
      expect.objectContaining({ id: softwareId, nombre: 'MATLAB' }),
    );
    const asignacion = await request(app.getHttpServer())
      .post(`/software/aulas/${aula.id}`)
      .send({ softwareId, instaladoEn: '2026-08-20' })
      .expect(201);
    expect(asignacion.body).toEqual(
      expect.objectContaining({ aulaId: aula.id, softwareId }),
    );
  });

  it('crea y asocia en una sola operación cuando no se suministra softwareId', async () => {
    const asignacion = await request(app.getHttpServer())
      .post(`/software/aulas/${aula.id}`)
      .send({
        nombre: 'Python',
        version: '3.12',
        descripcion: 'Lenguaje',
        instaladoEn: '2026-08-21',
      })
      .expect(201);
    expect(asignacion.body).toEqual(
      expect.objectContaining({ aulaId: aula.id, softwareId }),
    );
    expect(prisma.software.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { nombre_version: { nombre: 'Python', version: '3.12' } },
      }),
    );
  });
});
