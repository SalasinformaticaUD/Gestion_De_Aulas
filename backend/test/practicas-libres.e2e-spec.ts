import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { PracticasLibresController } from '../src/practicas-libres/practicas-libres.controller';
import { PracticasLibresService } from '../src/practicas-libres/practicas-libres.service';

describe('PracticasLibresController (e2e)', () => {
  const practicaId = '00000000-0000-4000-8000-000000000010';
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findStudent: jest.fn(),
    finish: jest.fn(),
    cancel: jest.fn(),
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PracticasLibresController],
      providers: [{ provide: PracticasLibresService, useValue: service }],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.create.mockResolvedValue({ id: practicaId });
    service.findAll.mockResolvedValue([]);
    service.finish.mockResolvedValue({
      id: practicaId,
      estado: 'DEVUELTO',
    });
  });

  it('registra y lista prácticas libres con contratos validados', async () => {
    await request(app.getHttpServer())
      .post('/practicas-libres')
      .send({
        codigoEstudiante: '20261001',
        nombreEstudiante: 'Estudiante Uno',
        aulaId: '00000000-0000-4000-8000-000000000001',
        inicio: '2026-08-20T08:00:00-05:00',
        finEstimada: '2026-08-20T10:00:00-05:00',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/practicas-libres?estado=ACTIVO&fecha=2026-08-20')
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith({
      estado: 'ACTIVO',
      fecha: '2026-08-20',
    });
  });

  it('finaliza una práctica libre', async () => {
    await request(app.getHttpServer())
      .patch(`/practicas-libres/${practicaId}/finalizar`)
      .send({ finReal: '2026-08-20T09:45:00-05:00' })
      .expect(200)
      .expect(({ body }: { body: { estado: string } }) =>
        expect(body.estado).toBe('DEVUELTO'),
      );
  });

  it('rechaza campos no definidos por el contrato', () =>
    request(app.getHttpServer())
      .post('/practicas-libres')
      .send({
        codigoEstudiante: '20261001',
        nombreEstudiante: 'Estudiante Uno',
        aulaId: '00000000-0000-4000-8000-000000000001',
        inicio: '2026-08-20T08:00:00-05:00',
        finEstimada: '2026-08-20T10:00:00-05:00',
        estado: 'DEVUELTO',
      })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
