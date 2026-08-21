import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { configureApp } from '../src/configure-app';
import { DependenciasController } from '../src/dependencias/dependencias.controller';
import { DependenciasService } from '../src/dependencias/dependencias.service';
import { PermisosController } from '../src/permisos/permisos.controller';
import { PermisosService } from '../src/permisos/permisos.service';
import { RolesController } from '../src/roles/roles.controller';
import { RolesService } from '../src/roles/roles.service';
import { UsuariosController } from '../src/usuarios/usuarios.controller';
import { UsuariosService } from '../src/usuarios/usuarios.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Administración (e2e)', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const dependencyService = { create: jest.fn() };
  const permissionService = { create: jest.fn() };
  const roleService = { create: jest.fn() };
  const userService = { create: jest.fn(), remove: jest.fn() };
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.AUTH_REQUIRED = 'false';
    process.env.PERMISSIONS_MODE = 'permissive';
    const module = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [
        DependenciasController,
        PermisosController,
        RolesController,
        UsuariosController,
      ],
      providers: [
        { provide: DependenciasService, useValue: dependencyService },
        { provide: PermisosService, useValue: permissionService },
        { provide: RolesService, useValue: roleService },
        { provide: UsuariosService, useValue: userService },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dependencyService.create.mockResolvedValue({
      id,
      nombre: 'Aulas de Software',
    });
    permissionService.create.mockResolvedValue({ id, codigo: 'AULAS_LEER' });
    roleService.create.mockResolvedValue({ id, nombre: 'OPERADOR' });
    userService.create.mockResolvedValue({ id, nombreUsuario: 'operador' });
    userService.remove.mockResolvedValue({ id, estado: 'INACTIVA' });
  });

  it('crea dependencia, permiso, rol y usuario mediante HTTP', async () => {
    await request(app.getHttpServer())
      .post('/dependencias')
      .send({ nombre: 'Aulas de Software' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/permisos')
      .send({ codigo: 'AULAS_LEER', moduloId: id })
      .expect(201);
    await request(app.getHttpServer())
      .post('/roles')
      .send({ nombre: 'OPERADOR', permisoIds: [id] })
      .expect(201);
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({
        nombreCompleto: 'Operador de pruebas',
        nombreUsuario: 'operador',
        correo: 'operador@example.test',
        password: 'Clave-segura-2026',
        rolIds: [id],
      })
      .expect(201);
  });

  it('desactiva el usuario mediante DELETE', async () => {
    await request(app.getHttpServer()).delete(`/usuarios/${id}`).expect(200);
    expect(userService.remove).toHaveBeenCalledWith(id, undefined);
  });

  afterAll(async () => {
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
    await app.close();
  });
});
