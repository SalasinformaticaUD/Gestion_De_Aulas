import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { PrestamosDocentesController } from '../src/prestamos-docentes/prestamos-docentes.controller';
import { PrestamosDocentesService } from '../src/prestamos-docentes/prestamos-docentes.service';

describe('PrestamosDocentesController (e2e)', () => {
  const prestamoId = '00000000-0000-4000-8000-000000000010';
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    cancel: jest.fn(),
    finish: jest.fn(),
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PrestamosDocentesController],
      providers: [{ provide: PrestamosDocentesService, useValue: service }],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.create.mockResolvedValue({
      id: prestamoId,
      estado: 'SOLICITADO',
    });
    service.findAll.mockResolvedValue([]);
    service.approve.mockResolvedValue({
      id: prestamoId,
      estado: 'APROBADO',
    });
    service.cancel.mockResolvedValue({
      id: prestamoId,
      estado: 'CANCELADO',
    });
  });

  it('crea y consulta solicitudes con filtros', async () => {
    await request(app.getHttpServer())
      .post('/prestamos-docentes')
      .send({
        docenteId: '00000000-0000-4000-8000-000000000002',
        aulaId: '00000000-0000-4000-8000-000000000001',
        inicio: '2026-08-20T08:00:00-05:00',
        fin: '2026-08-20T10:00:00-05:00',
        motivo: 'Semillero',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/prestamos-docentes?estado=SOLICITADO&fecha=2026-08-20')
      .expect(200);
    expect(service.findAll).toHaveBeenCalledWith({
      estado: 'SOLICITADO',
      fecha: '2026-08-20',
    });
  });

  it('aprueba y cancela solicitudes', async () => {
    await request(app.getHttpServer())
      .patch(`/prestamos-docentes/${prestamoId}/aprobar`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/prestamos-docentes/${prestamoId}/cancelar`)
      .expect(200);
  });

  it('rechaza campos ajenos al contrato', () =>
    request(app.getHttpServer())
      .post('/prestamos-docentes')
      .send({
        docenteId: '00000000-0000-4000-8000-000000000002',
        aulaId: '00000000-0000-4000-8000-000000000001',
        inicio: '2026-08-20T08:00:00-05:00',
        fin: '2026-08-20T10:00:00-05:00',
        estado: 'APROBADO',
      })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
