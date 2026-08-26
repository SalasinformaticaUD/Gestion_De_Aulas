import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoCuenta } from '../generated/prisma/enums.js';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { AuthModule } from '../src/auth/auth.module';
import { PasswordHashService } from '../src/auth/password-hash.service';
import { configureApp } from '../src/configure-app';
import { CredencialesModule } from '../src/credenciales/credenciales.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Permiso = {
  permiso: { codigo: string; modulo: { codigo: string; activo: boolean } };
};
type Usuario = {
  id: string;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  passwordHash: string;
  cargo: string | null;
  estado: EstadoCuenta;
  dependencia: null;
  roles: Array<{ rol: { nombre: string; permisos: Permiso[] } }>;
};
type Credencial = {
  id: string;
  nombre: string;
  categoria: string;
  usuario: string | null;
  secretoCifrado: string;
  descripcion: string | null;
  estado: string;
  creadoEn: Date;
  actualizadoEn: Date;
  accesos: Array<{
    credencialId: string;
    usuarioId: string;
    puedeVer: boolean;
    puedeEditar: boolean;
    usuario: { id: string; nombreCompleto: string; nombreUsuario: string };
  }>;
};

describe('CredencialesController (e2e)', () => {
  const creadorId = '00000000-0000-4000-8000-000000000001';
  const lectorId = '00000000-0000-4000-8000-000000000002';
  const credencialId = '00000000-0000-4000-8000-000000000003';
  const password = 'Clave-segura-2026';
  const hash = new PasswordHashService().hash(password);
  const usuario = (
    id: string,
    nombreUsuario: string,
    permisos: string[],
  ): Usuario => ({
    id,
    nombreCompleto: nombreUsuario,
    nombreUsuario,
    correo: `${nombreUsuario}@udistrital.edu.co`,
    passwordHash: hash,
    cargo: null,
    estado: EstadoCuenta.ACTIVA,
    dependencia: null,
    roles: [
      {
        rol: {
          nombre: 'OPERADOR',
          permisos: permisos.map((codigo) => ({
            permiso: {
              codigo,
              modulo: { codigo: 'CREDENCIALES', activo: true },
            },
          })),
        },
      },
    ],
  });
  const usuarios = [
    usuario(creadorId, 'creador', [
      'CREDENCIALES_CREAR',
      'CREDENCIALES_LEER',
      'CREDENCIALES_ACTUALIZAR',
      'CREDENCIALES_VER_SECRETO',
    ]),
    usuario(lectorId, 'lector', ['CREDENCIALES_LEER']),
  ];
  let credenciales: Credencial[] = [];
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    usuario: {
      findFirst: jest.fn(
        ({
          where,
        }: {
          where: { OR: Array<{ nombreUsuario?: string; correo?: string }> };
        }) =>
          Promise.resolve(
            usuarios.find((u) =>
              where.OR.some(
                (x) =>
                  x.nombreUsuario === u.nombreUsuario || x.correo === u.correo,
              ),
            ) ?? null,
          ),
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(usuarios.find((u) => u.id === where.id) ?? null),
      ),
    },
    credencialOperativa: {
      create: jest.fn(
        ({
          data,
        }: {
          data: {
            nombre: string;
            categoria: string;
            usuario?: string;
            secretoCifrado: string;
            descripcion?: string;
            estado?: string;
            accesos: {
              create: {
                usuarioId: string;
                puedeVer: boolean;
                puedeEditar: boolean;
              };
            };
          };
        }) => {
          const owner = usuarios.find(
            (u) => u.id === data.accesos.create.usuarioId,
          )!;
          const c: Credencial = {
            id: credencialId,
            nombre: data.nombre,
            categoria: data.categoria,
            usuario: data.usuario ?? null,
            secretoCifrado: data.secretoCifrado,
            descripcion: data.descripcion ?? null,
            estado: data.estado ?? 'ACTIVA',
            creadoEn: new Date(),
            actualizadoEn: new Date(),
            accesos: [
              {
                credencialId,
                usuarioId: owner.id,
                puedeVer: true,
                puedeEditar: true,
                usuario: {
                  id: owner.id,
                  nombreCompleto: owner.nombreCompleto,
                  nombreUsuario: owner.nombreUsuario,
                },
              },
            ],
          };
          credenciales.push(c);
          return Promise.resolve(c);
        },
      ),
      findMany: jest.fn(
        ({
          where,
        }: {
          where: { AND?: Array<{ accesos: { some: { usuarioId: string } } }> };
        }) =>
          Promise.resolve(
            credenciales.filter((c) => {
              const id = where.AND?.[0]?.accesos.some.usuarioId;
              return (
                !id || c.accesos.some((a) => a.usuarioId === id && a.puedeVer)
              );
            }),
          ),
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(credenciales.find((c) => c.id === where.id) ?? null),
      ),
    },
  };
  let app: INestApplication<App>;
  beforeAll(async () => {
    process.env.AUTH_TOKEN_SECRET = 'secreto-e2e-credenciales';
    process.env.CREDENTIALS_ENCRYPTION_KEY =
      'clave-e2e-credenciales-con-entropia-suficiente';
    process.env.AUTH_REQUIRED = 'true';
    process.env.PERMISSIONS_MODE = 'strict';
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, CredencialesModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(AuditoriaService)
      .useValue(auditoria)
      .compile();
    app = fixture.createNestApplication();
    configureApp(app);
    await app.init();
  });
  beforeEach(() => {
    credenciales = [];
    jest.clearAllMocks();
  });
  const token = async (identificador: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identificador, password })
      .expect(201);
    return (response.body as unknown as { accessToken: string }).accessToken;
  };
  it('crea una credencial cifrada sin exponer el secreto y solo la revela con permiso', async () => {
    const creador = await token('creador');
    const lector = await token('lector');
    const creada = await request(app.getHttpServer())
      .post('/credenciales')
      .set('Authorization', `Bearer ${creador}`)
      .send({
        nombre: 'Servidor principal',
        categoria: 'SERVIDORES',
        usuario: 'root',
        secreto: 'Secreto-real-123',
      })
      .expect(201);
    expect(creada.body).not.toHaveProperty('secreto');
    expect(creada.body).not.toHaveProperty('secretoCifrado');
    expect(credenciales[0]?.secretoCifrado).not.toContain('Secreto-real-123');
    await request(app.getHttpServer())
      .get(`/credenciales/${credencialId}/secreto`)
      .set('Authorization', `Bearer ${lector}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/credenciales/${credencialId}/secreto`)
      .set('Authorization', `Bearer ${creador}`)
      .expect(200)
      .expect(({ body }: { body: { secreto: string } }) =>
        expect(body.secreto).toBe('Secreto-real-123'),
      );
    expect(auditoria.registrar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        accion: 'LOGIN',
        datosNuevos: { consultaSecreto: true },
      }),
    );
  });
  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_TOKEN_SECRET;
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
  });
});
