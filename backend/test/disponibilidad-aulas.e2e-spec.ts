import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DisponibilidadAulasModule } from '../src/disponibilidad-aulas/disponibilidad-aulas.module';
import { DisponibilidadAulasService } from '../src/disponibilidad-aulas/disponibilidad-aulas.service';

describe('DisponibilidadAulasController (e2e)', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  let app: INestApplication<App>;

  const service = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({
      aula: { id: aulaId, codigo: 'LAB-01' },
      bloque: {
        fecha: '2026-08-20',
        horaInicio: '08:00',
        horaFin: '10:00',
        duracionHoras: 2,
      },
      estadoCalculado: 'disponible',
      persistido: false,
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DisponibilidadAulasModule],
    })
      .overrideProvider(DisponibilidadAulasService)
      .useValue(service)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());

  it('consulta todas las salas para un bloque de dos horas', async () => {
    await request(app.getHttpServer())
      .get(
        '/disponibilidad-aulas?fecha=2026-08-20&horaInicio=08:00&horaFin=10:00',
      )
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith({
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
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

  it('rechaza bloques con formato inválido', () =>
    request(app.getHttpServer())
      .get(
        '/disponibilidad-aulas?fecha=2026-08-20&horaInicio=09:30&horaFin=11:30',
      )
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
