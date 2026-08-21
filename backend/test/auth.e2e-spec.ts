import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoCuenta } from '../generated/prisma/enums.js';
import { AuthModule } from '../src/auth/auth.module';
import type { UsuarioAutenticado } from '../src/auth/auth.types';
import { CurrentUser } from '../src/auth/decorators/current-user.decorator';
import { RequireAuth } from '../src/auth/decorators/require-auth.decorator';
import { RequireModule } from '../src/auth/decorators/require-module.decorator';
import { PasswordHashService } from '../src/auth/password-hash.service';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

@RequireAuth()
@Controller('auth-test')
class AuthTestController {
  @RequireModule('AULAS')
  @Get('aulas')
  aulas(@CurrentUser() usuario: UsuarioAutenticado) {
    return { usuarioId: usuario.id };
  }
}

describe('AuthController (e2e)', () => {
  const usuarioId = '00000000-0000-4000-8000-000000000001';
  const password = 'Clave-segura-2026';
  const passwordHash = new PasswordHashService().hash(password);
  const usuario = {
    id: usuarioId,
    nombreCompleto: 'Usuario de Prueba',
    nombreUsuario: 'operador',
    correo: 'operador@udistrital.edu.co',
    passwordHash,
    cargo: 'Técnico',
    estado: EstadoCuenta.ACTIVA,
    dependencia: {
      id: '00000000-0000-4000-8000-000000000002',
      nombre: 'Aulas de Software',
    },
    roles: [
      {
        rol: {
          nombre: 'OPERADOR',
          permisos: [] as Array<{
            permiso: {
              codigo: string;
              modulo: { codigo: string; activo: boolean };
            };
          }>,
        },
      },
    ],
  };
  const prisma = {
    usuario: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.AUTH_TOKEN_SECRET = 'secreto-exclusivo-para-pruebas-e2e';
    process.env.AUTH_REQUIRED = 'false';
    process.env.PERMISSIONS_MODE = 'permissive';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [AuthTestController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    usuario.roles[0].rol.permisos = [];
    prisma.usuario.findFirst.mockResolvedValue(usuario);
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    process.env.PERMISSIONS_MODE = 'permissive';
  });

  it('inicia sesion y recupera el usuario actual sin exponer el hash', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identificador: usuario.nombreUsuario, password })
      .expect(201);
    const login = loginResponse.body as {
      accessToken: string;
      usuario: Record<string, unknown>;
    };

    expect(login.accessToken).toEqual(expect.any(String));
    expect(login.usuario).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .expect(200)
      .expect(({ body }: { body: UsuarioAutenticado }) => {
        expect(body.id).toBe(usuarioId);
        expect(body.roles).toEqual(['OPERADOR']);
      });
  });

  it('rechaza credenciales invalidas y exige token en auth/me', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identificador: usuario.nombreUsuario, password: 'incorrecta' })
      .expect(401);

    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('permite el modulo en modo permisivo y lo exige en modo estricto', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identificador: usuario.correo, password })
      .expect(201);
    const token = (loginResponse.body as { accessToken: string }).accessToken;

    await request(app.getHttpServer())
      .get('/auth-test/aulas')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    process.env.PERMISSIONS_MODE = 'strict';
    await request(app.getHttpServer()).get('/auth-test/aulas').expect(401);

    await request(app.getHttpServer())
      .get('/auth-test/aulas')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    usuario.roles[0].rol.permisos = [
      {
        permiso: {
          codigo: 'AULAS_CONSULTAR',
          modulo: { codigo: 'AULAS', activo: true },
        },
      },
    ];
    await request(app.getHttpServer())
      .get('/auth-test/aulas')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ usuarioId });
  });

  afterAll(async () => {
    delete process.env.AUTH_TOKEN_SECRET;
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
    await app.close();
  });
});
