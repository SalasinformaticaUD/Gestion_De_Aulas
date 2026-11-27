import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../configure-app';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { InventariosAutorizacionController } from './inventarios-autorizacion.controller';
import { InventariosServiceTokenGuard } from './guards/inventarios-service-token.guard';

const id = '11111111-1111-4111-8111-111111111111';
const aula = '22222222-2222-4222-8222-222222222222';
const token = 'credencial-ficticia-exclusiva-de-servicio';
const ruta = `/integraciones/inventarios/usuarios/${id}/autorizacion`;

it('exige credencial de servicio y consulta solo las asignaciones vigentes del autor activo', async () => {
  const anterior = process.env.COSMOS_INVENTARIOS_SERVICE_TOKEN;
  process.env.COSMOS_INVENTARIOS_SERVICE_TOKEN = token;
  const findAuthenticatedUser = jest.fn().mockResolvedValue({
    id,
    permisos: ['AULAS_LEER', 'DOCUMENTO_LAI_GENERAR'],
    roles: [],
    modulos: ['AULAS'],
  });
  const findMany = jest.fn().mockResolvedValue([{ id: aula }]);
  const modulo = await Test.createTestingModule({
    controllers: [InventariosAutorizacionController],
    providers: [
      InventariosServiceTokenGuard,
      { provide: AuthService, useValue: { findAuthenticatedUser } },
      { provide: PrismaService, useValue: { aula: { findMany } } },
    ],
  }).compile();
  const app =
    modulo.createNestApplication<
      import('@nestjs/common').INestApplication<App>
    >();
  configureApp(app);
  try {
    await app.init();
    await request(app.getHttpServer())
      .get(ruta)
      .auth('otra-credencial', { type: 'bearer' })
      .expect(401);
    expect(findAuthenticatedUser).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get(ruta)
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect({
        id,
        permisos: ['AULAS_LEER', 'DOCUMENTO_LAI_GENERAR'],
        roles: [],
        aulas: [aula],
      });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { responsableId: id, eliminadoEn: null },
      }),
    );
    findMany.mockResolvedValueOnce([]);
    await request(app.getHttpServer())
      .get(ruta)
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect({
        id,
        permisos: ['AULAS_LEER', 'DOCUMENTO_LAI_GENERAR'],
        roles: [],
        aulas: [],
      });
    findAuthenticatedUser.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get(ruta)
      .auth(token, { type: 'bearer' })
      .expect(403);
  } finally {
    await app.close();
    if (anterior === undefined)
      delete process.env.COSMOS_INVENTARIOS_SERVICE_TOKEN;
    else process.env.COSMOS_INVENTARIOS_SERVICE_TOKEN = anterior;
  }
});
