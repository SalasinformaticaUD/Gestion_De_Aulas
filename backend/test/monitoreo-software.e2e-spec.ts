import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EstadoCuenta } from '../generated/prisma/enums.js';
import { AuthModule } from '../src/auth/auth.module';
import { AuthTokenService } from '../src/auth/auth-token.service';
import { configureApp } from '../src/configure-app';
import { MonitoreoSoftwareController } from '../src/monitoreo-software/monitoreo-software.controller';
import { MonitoreoSoftwareService } from '../src/monitoreo-software/monitoreo-software.service';
import { RELOJ_MONITOREO } from '../src/monitoreo-software/monitoreo-software.constants';
import { PrismaService } from '../src/prisma/prisma.service';
import { MENSAJE_SOFTRACKER_NO_DISPONIBLE } from '../src/softracker-db/softracker-db.constants';
import { SoftrackerDbService } from '../src/softracker-db/softracker-db.service';

// Un permiso tal como lo lee `AuthService.toAuthenticatedUser`: el acceso al
// módulo se deriva de `permiso.modulo` cuando `activo` es verdadero.
interface PermisoSimulado {
  codigo: string;
  modulo: { codigo: string; activo: boolean };
}

// Instante fijo del reloj inyectado: todas las respuestas comparten `generadoEn`.
const AHORA = Date.parse('2026-10-07T14:05:00.000Z');

// Filas crudas de ejemplo que devuelve el `SoftrackerDbService` simulado.
const FILAS_AULAS = [{ sala_codigo: '306' }];
const FILAS_SOFTWARE = [
  { id: 'autocad', nombre: 'AutoCAD', categoria: 'Diseño' },
];
const FILAS_CATEGORIAS = [{ categoria: 'Diseño' }];

describe('MonitoreoSoftwareController (e2e)', () => {
  const usuarioId = '00000000-0000-4000-8000-000000000010';

  // Devuelve el usuario que `findAuthenticatedUser` espera, con los permisos del
  // caso. Los módulos del usuario se derivan de los permisos con módulo activo.
  const crearUsuario = (permisos: PermisoSimulado[]) => ({
    id: usuarioId,
    nombreCompleto: 'Usuario de Monitoreo',
    nombreUsuario: 'monitor',
    correo: 'monitor@udistrital.edu.co',
    fotoPerfil: null,
    cargo: 'Técnico',
    estado: EstadoCuenta.ACTIVA,
    perfilMonitores: null,
    dependenciaMonitores: null,
    dependencia: {
      id: '00000000-0000-4000-8000-000000000011',
      nombre: 'Aulas de Software',
    },
    roles: [
      {
        rol: {
          nombre: 'OPERADOR',
          permisos: permisos.map((permiso) => ({ permiso })),
        },
      },
    ],
  });

  const permisoLeer: PermisoSimulado = {
    codigo: 'MONITOREO_SOFTWARE_LEER',
    modulo: { codigo: 'MONITOREO_SOFTWARE', activo: true },
  };
  const permisoExportar: PermisoSimulado = {
    codigo: 'MONITOREO_SOFTWARE_EXPORTAR',
    modulo: { codigo: 'MONITOREO_SOFTWARE', activo: true },
  };
  const permisoAulas: PermisoSimulado = {
    codigo: 'AULAS_LEER',
    modulo: { codigo: 'AULAS', activo: true },
  };

  const prisma = {
    usuario: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const consultar = jest.fn();

  let app: INestApplication<App>;
  let tokens: AuthTokenService;

  // Firma un token válido para `usuarioId`. El payload solo necesita las claves
  // que `AuthTokenService.verify` valida; los permisos efectivos los resuelve
  // `findAuthenticatedUser` contra el PrismaService simulado.
  const firmarToken = () =>
    tokens.sign({
      sub: usuarioId,
      nombreUsuario: 'monitor',
      dependenciaId: null,
      roles: ['OPERADOR'],
      permisos: [],
    }).accessToken;

  // Ajusta los permisos que `findAuthenticatedUser` verá para la próxima
  // solicitud autenticada.
  const configurarPermisos = (permisos: PermisoSimulado[]) => {
    prisma.usuario.findUnique.mockResolvedValue(crearUsuario(permisos));
  };

  beforeAll(() => {
    process.env.AUTH_TOKEN_SECRET = 'secreto-exclusivo-para-pruebas-e2e';
    process.env.AUTH_REQUIRED = 'true';
    process.env.PERMISSIONS_MODE = 'strict';
  });

  // La caché vive en la instancia del servicio: se recrea la app por caso para
  // aislar los efectos de la caché entre pruebas.
  beforeEach(async () => {
    jest.clearAllMocks();
    consultar.mockImplementation((sql: string) => {
      if (sql.includes('resumen_diario_uso'))
        return Promise.resolve(FILAS_AULAS);
      if (sql.includes('categoria IS NOT NULL'))
        return Promise.resolve(FILAS_CATEGORIAS);
      return Promise.resolve(FILAS_SOFTWARE);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [MonitoreoSoftwareController],
      providers: [
        MonitoreoSoftwareService,
        { provide: RELOJ_MONITOREO, useValue: () => AHORA },
        { provide: SoftrackerDbService, useValue: { consultar } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    tokens = moduleFixture.get(AuthTokenService);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    delete process.env.AUTH_TOKEN_SECRET;
    delete process.env.AUTH_REQUIRED;
    delete process.env.PERMISSIONS_MODE;
  });

  it('autoriza con MONITOREO_SOFTWARE_LEER y devuelve los filtros (Req 4.3, 6.1)', async () => {
    configurarPermisos([permisoLeer]);

    const respuesta = await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .set('Authorization', `Bearer ${firmarToken()}`)
      .expect(200);
    const body = respuesta.body as Record<string, unknown>;

    expect(body).toEqual({
      aulas: ['306'],
      software: [{ id: 'autocad', nombre: 'AutoCAD', categoria: 'Diseño' }],
      categorias: ['Diseño'],
      generadoEn: new Date(AHORA).toISOString(),
    });
    expect(consultar).toHaveBeenCalledTimes(3);
  });

  it('rechaza sin token con 401 y no consulta Softracker (Req 4.10)', async () => {
    configurarPermisos([permisoLeer]);

    await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .expect(401);

    expect(consultar).not.toHaveBeenCalled();
  });

  it('rechaza con 403 a un usuario sin el módulo y no consulta (Req 4.11, 6.2)', async () => {
    configurarPermisos([permisoAulas]);

    await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .set('Authorization', `Bearer ${firmarToken()}`)
      .expect(403);

    expect(consultar).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si tiene el módulo pero no LEER y no consulta (Req 4.12, 6.9)', async () => {
    configurarPermisos([permisoExportar]);

    await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .set('Authorization', `Bearer ${firmarToken()}`)
      .expect(403);

    expect(consultar).not.toHaveBeenCalled();
  });

  it('un rechazo previo no crea caché: la solicitud autorizada consulta 3 veces (Req 5.6)', async () => {
    // Primero un usuario sin permiso de módulo: 403 sin tocar la caché.
    configurarPermisos([permisoAulas]);
    await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .set('Authorization', `Bearer ${firmarToken()}`)
      .expect(403);
    expect(consultar).not.toHaveBeenCalled();

    // Luego un usuario autorizado: como el rechazo no creó entrada de caché, la
    // solicitud ejecuta las tres consultas.
    configurarPermisos([permisoLeer]);
    const respuesta = await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .set('Authorization', `Bearer ${firmarToken()}`)
      .expect(200);
    const body = respuesta.body as Record<string, unknown>;

    expect(body.aulas).toEqual(['306']);
    expect(consultar).toHaveBeenCalledTimes(3);
  });

  it('responde 503 con el formato de HttpExceptionFilter si Softracker está caído (Req 4.13, 6.3)', async () => {
    configurarPermisos([permisoLeer]);
    consultar.mockRejectedValue(
      new ServiceUnavailableException(MENSAJE_SOFTRACKER_NO_DISPONIBLE),
    );

    const respuesta = await request(app.getHttpServer())
      .get('/monitoreo-software/filtros')
      .set('Authorization', `Bearer ${firmarToken()}`)
      .expect(503);
    const body = respuesta.body as Record<string, unknown>;

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(body).toEqual({
      statusCode: 503,
      message: MENSAJE_SOFTRACKER_NO_DISPONIBLE,
      error: expect.any(String),
      path: '/monitoreo-software/filtros',
      timestamp: expect.any(String),
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    // El cuerpo no expone datos del catálogo ni detalles de la conexión.
    expect(body).not.toHaveProperty('aulas');
    const serializado = JSON.stringify(body);
    expect(serializado).not.toMatch(/select/i);
    expect(serializado).not.toMatch(/postgres/i);
    expect(serializado).not.toMatch(/resumen_diario_uso/i);
  });
});
