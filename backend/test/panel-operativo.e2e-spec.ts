import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { PanelOperativoController } from '../src/panel-operativo/panel-operativo.controller';
import { PanelOperativoService } from '../src/panel-operativo/panel-operativo.service';

describe('PanelOperativoController (e2e)', () => {
  const service = {
    resumen: jest.fn(),
    aulas: jest.fn(),
    alertas: jest.fn(),
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PanelOperativoController],
      providers: [{ provide: PanelOperativoService, useValue: service }],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.resumen.mockResolvedValue({
      metricas: { ocupadas: 1, disponibles: 1, alertas: 1 },
      alertas: [{ severidad: 'advertencia' }],
      persistido: false,
    });
    service.aulas.mockResolvedValue({
      total: 2,
      items: [
        { estadoCalculado: 'ocupada' },
        { estadoCalculado: 'disponible' },
      ],
      persistido: false,
    });
    service.alertas.mockResolvedValue([{ severidad: 'advertencia' }]);
  });

  it('expone resumen con un aula ocupada, una libre y alerta', async () => {
    const response = await request(app.getHttpServer())
      .get('/panel-operativo/resumen?fecha=2026-08-20')
      .expect(200);
    expect(response.body).toMatchObject({
      metricas: { ocupadas: 1, disponibles: 1, alertas: 1 },
      persistido: false,
    });
  });

  it('expone aulas y alertas con rutas de solo lectura', async () => {
    await request(app.getHttpServer())
      .get('/panel-operativo/aulas?fecha=2026-08-20')
      .expect(200);
    await request(app.getHttpServer())
      .get('/panel-operativo/alertas?fecha=2026-08-20')
      .expect(200);
    await request(app.getHttpServer())
      .post('/panel-operativo')
      .send({})
      .expect(404);
  });

  afterAll(async () => app.close());
});
