import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditoriaModule } from '../src/auditoria/auditoria.module';
import { AuthModule } from '../src/auth/auth.module';
import { AuthTokenService } from '../src/auth/auth-token.service';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auditoría (e2e)', () => {
  let app: INestApplication<App>;
  let tokens: AuthTokenService;
  const userId = '00000000-0000-4000-8000-000000000001';
  const prisma = {
    usuario: {
      findUnique: jest.fn().mockResolvedValue({
        id: userId,
        nombreCompleto: 'Administradora',
        nombreUsuario: 'admin',
        correo: 'admin@example.test',
        cargo: null,
        estado: 'ACTIVA',
        dependencia: null,
        roles: [
          {
            rol: {
              nombre: 'ADMINISTRADOR',
              permisos: [
                {
                  permiso: {
                    codigo: 'ADMINISTRACION_LEER',
                    modulo: { codigo: 'ADMINISTRACION', activo: true },
                  },
                },
              ],
            },
          },
        ],
      }),
    },
    auditoria: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.AUTH_REQUIRED = 'true';
    process.env.PERMISSIONS_MODE = 'strict';
    process.env.JWT_SECRET = 'secreto-e2e-auditoria';
    const module = await Test.createTestingModule({
      imports: [AuthModule, AuditoriaModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    tokens = module.get(AuthTokenService);
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('rechaza la consulta sin token y la permite a administración', async () => {
    await request(app.getHttpServer()).get('/auditoria').expect(401);
    const { accessToken } = tokens.sign({
      sub: userId,
      nombreUsuario: 'admin',
      dependenciaId: null,
      roles: ['ADMINISTRADOR'],
      permisos: ['ADMINISTRACION_LEER'],
    });
    await request(app.getHttpServer())
      .get('/auditoria')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect([]);
  });

  afterAll(async () => {
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
    delete process.env.JWT_SECRET;
    await app.close();
  });
});
