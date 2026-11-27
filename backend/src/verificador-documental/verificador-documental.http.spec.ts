import { PersonalDataExtractionService } from './personal-data-extraction.service';
import { DocumentValidationService } from './document-validation.service';
import { DocumentalAccessGuard } from './documental-access.guard';
import { PersonalDataComparisonService } from './personal-data-comparison.service';
import { DocumentClassificationService } from './document-classification.service';
import { PdfTextService } from './pdf-text.service';
import { PDFDocument, PDFName } from 'pdf-lib';
import { createHash } from 'node:crypto';
import { LIMITES_CARGA } from './verificador-documental.constants';
import { PdfValidationService } from './pdf-validation.service';
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../configure-app';
import { AuthService } from '../auth/auth.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { AuthenticationGuard } from '../auth/guards/authentication.guard';
import { ModulePermissionsGuard } from '../auth/guards/module-permissions.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { VerificadorDocumentalController } from './verificador-documental.controller';
import { VerificadorDocumentalService } from './verificador-documental.service';

const id = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
const base = '/verificador-documental';
const datos = {
  tipoIdentificacion: 'CC',
  numeroIdentificacion: '123456789',
  nombreCompleto: 'Persona de Prueba',
  fechaSolicitud: '2026-11-25',
  modalidadCarga: 'PDF_UNIFICADO',
};

// Se ejercitan HTTP, DTO, servicio y guardias reales. Solo persistencia y JWT
// se sustituyen para no depender de datos ni credenciales personales.
describe('Verificador documental HTTP', () => {
  let app: INestApplication<Server>;
  const previous = process.env.PERMISSIONS_MODE;
  const prisma = {
    verificacionDocumental: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditoria: { create: jest.fn() },
    archivoVerificacionDocumental: { createMany: jest.fn() },
    hallazgoVerificacionDocumental: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    documentoVerificacionDocumental: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const permisos: Record<string, string[]> = {
    lector: ['VERIFICADOR_DOCUMENTAL_LEER'],
    gestor: ['VERIFICADOR_DOCUMENTAL_LEER', 'VERIFICADOR_DOCUMENTAL_CREAR'],
    soloCrear: ['VERIFICADOR_DOCUMENTAL_CREAR'],
    ajeno: [],
    sinPermisos: [],
    eliminador: [
      'VERIFICADOR_DOCUMENTAL_LEER',
      'VERIFICADOR_DOCUMENTAL_ELIMINAR',
    ],
    soloEliminar: ['VERIFICADOR_DOCUMENTAL_ELIMINAR'],
  };

  beforeAll(async () => {
    process.env.PERMISSIONS_MODE = 'strict';
    const module = await Test.createTestingModule({
      controllers: [VerificadorDocumentalController],
      providers: [
        VerificadorDocumentalService,
        PdfValidationService,
        DocumentClassificationService,
        PersonalDataExtractionService,
        PersonalDataComparisonService,
        DocumentValidationService,
        DocumentalAccessGuard,
        {
          provide: PdfTextService,
          useValue: {
            extraer: (_buffer: Buffer, count: number) =>
              Promise.resolve(
                Array.from({ length: count }, (_, i) => ({
                  pagina: i + 1,
                  texto: '',
                })),
              ),
          },
        },
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuthTokenService,
          useValue: {
            verify: (token: string) =>
              permisos[token] ? { sub: token } : null,
          },
        },
        {
          provide: AuthService,
          useValue: {
            findAuthenticatedUser: (token: string) => ({
              id: userId,
              nombreCompleto: 'Funcionario',
              permisos: permisos[token],
              modulos:
                token === 'ajeno' ? ['AULAS'] : ['VERIFICADOR_DOCUMENTAL'],
            }),
          },
        },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: ModulePermissionsGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (
        operation:
          ((tx: typeof prisma) => Promise<unknown>) | Promise<unknown>[],
      ) =>
        typeof operation === 'function'
          ? operation(prisma)
          : Promise.all(operation),
    );
    prisma.verificacionDocumental.create.mockImplementation(
      ({ data }: { data: object }) => Promise.resolve({ id, ...data }),
    );
    prisma.verificacionDocumental.findMany.mockResolvedValue([]);
    prisma.verificacionDocumental.count.mockResolvedValue(0);
    prisma.verificacionDocumental.findUnique.mockResolvedValue(null);
    prisma.auditoria.create.mockResolvedValue({});
    prisma.verificacionDocumental.updateMany.mockResolvedValue({ count: 1 });
    prisma.verificacionDocumental.update.mockResolvedValue({});
    prisma.verificacionDocumental.deleteMany.mockResolvedValue({ count: 1 });
    prisma.archivoVerificacionDocumental.createMany.mockResolvedValue({
      count: 1,
    });
    prisma.hallazgoVerificacionDocumental.create.mockResolvedValue({});
    prisma.hallazgoVerificacionDocumental.createMany.mockResolvedValue({
      count: 1,
    });
    prisma.documentoVerificacionDocumental.createMany.mockResolvedValue({
      count: 1,
    });
    prisma.documentoVerificacionDocumental.findMany.mockResolvedValue([]);
  });
  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.PERMISSIONS_MODE;
    else process.env.PERMISSIONS_MODE = previous;
  });

  it('rechaza acceso anónimo, token inválido y módulo ajeno', async () => {
    await request(app.getHttpServer())
      .get(`${base}/verificaciones`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`${base}/verificaciones`)
      .auth('invalido', { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get(`${base}/verificaciones`)
      .auth('ajeno', { type: 'bearer' })
      .expect(403);
    expect(prisma.verificacionDocumental.findMany).not.toHaveBeenCalled();
  });
  it('permite catálogo e historial al lector pero no crear', async () => {
    const catalogo = await request(app.getHttpServer())
      .get(`${base}/catalogos`)
      .auth('lector', { type: 'bearer' })
      .expect(200);
    const cuerpo = catalogo.body as ReturnType<
      VerificadorDocumentalService['catalogos']
    >;
    expect(cuerpo.documentosRequeridos).toHaveLength(8);
    expect(cuerpo.validacion).toBe('TODOS_LOS_CAMPOS_DISPONIBLES');
    await request(app.getHttpServer())
      .get(`${base}/verificaciones`)
      .auth('lector', { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`${base}/verificaciones`)
      .auth('lector', { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(app.getHttpServer())
      .post(`${base}/verificaciones`)
      .auth('soloCrear', { type: 'bearer' })
      .send(datos)
      .expect(403);
    expect(prisma.verificacionDocumental.create).not.toHaveBeenCalled();
  });
  it.each(['ajeno', 'sinPermisos', 'soloCrear'])(
    'mantiene permisos estrictos para %s incluso en modo permisivo',
    async (token) => {
      process.env.PERMISSIONS_MODE = 'permissive';
      try {
        await request(app.getHttpServer())
          .get(`${base}/catalogos`)
          .auth(token, { type: 'bearer' })
          .expect(403);
        await request(app.getHttpServer())
          .get(`${base}/verificaciones`)
          .auth(token, { type: 'bearer' })
          .expect(403);
        await request(app.getHttpServer())
          .get(`${base}/verificaciones/${id}`)
          .auth(token, { type: 'bearer' })
          .expect(403);
        await request(app.getHttpServer())
          .post(`${base}/verificaciones`)
          .auth(token, { type: 'bearer' })
          .send(datos)
          .expect(403);
        await request(app.getHttpServer())
          .post(`${base}/verificaciones/${id}/procesar`)
          .auth(token, { type: 'bearer' })
          .expect(403);
        expect(prisma.verificacionDocumental.findMany).not.toHaveBeenCalled();
        expect(prisma.verificacionDocumental.findUnique).not.toHaveBeenCalled();
        expect(prisma.verificacionDocumental.create).not.toHaveBeenCalled();
      } finally {
        process.env.PERMISSIONS_MODE = 'strict';
      }
    },
  );
  it('no permite crear al lector en modo permisivo y exige sesión', async () => {
    process.env.PERMISSIONS_MODE = 'permissive';
    try {
      await request(app.getHttpServer())
        .post(`${base}/verificaciones`)
        .auth('lector', { type: 'bearer' })
        .send(datos)
        .expect(403);
      await request(app.getHttpServer())
        .get(`${base}/verificaciones`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`${base}/catalogos`)
        .auth('gestor', { type: 'bearer' })
        .expect(200);
    } finally {
      process.env.PERMISSIONS_MODE = 'strict';
    }
  });
  it('evita caché de datos personales en respuestas correctas y errores de validación', async () => {
    const lectura = await request(app.getHttpServer())
      .get(`${base}/verificaciones`)
      .auth('lector', { type: 'bearer' })
      .expect(200);
    expect(lectura.headers['cache-control']).toBe('private, no-store');
    expect(lectura.headers.pragma).toBe('no-cache');
    const error = await request(app.getHttpServer())
      .post(`${base}/verificaciones`)
      .auth('gestor', { type: 'bearer' })
      .send({ ...datos, fechaSolicitud: 'incorrecta' })
      .expect(400);
    expect(error.headers['cache-control']).toBe('private, no-store');
  });
  it('la API no publica un éxito histórico sin documentos ni evidencias', async () => {
    const registro = {
      id,
      ...datos,
      estado: 'SATISFACTORIA',
      versionClasificacion: null,
      versionComparacion: null,
      resultadoComparacion: null,
      archivos: [],
      hallazgos: [],
      _count: { archivos: 0, hallazgos: 0 },
    };
    prisma.verificacionDocumental.findUnique.mockResolvedValue(registro);
    prisma.verificacionDocumental.findMany.mockResolvedValue([registro]);
    const detalle = await request(app.getHttpServer())
      .get(`${base}/verificaciones/${id}`)
      .auth('lector', { type: 'bearer' })
      .expect(200);
    expect(detalle.body as unknown).toMatchObject({ estado: 'INCOMPLETA' });
    const lista = await request(app.getHttpServer())
      .get(`${base}/verificaciones`)
      .auth('lector', { type: 'bearer' })
      .expect(200);
    expect(lista.body as unknown).toMatchObject({
      data: [{ estado: 'INCOMPLETA' }],
    });
    expect(prisma.verificacionDocumental.update).not.toHaveBeenCalled();
  });
  it('no publica ni registra los argumentos personales de una excepción interna', async () => {
    const privado = 'DATO_PERSONAL_FICTICIO_QUE_NO_DEBE_REGISTRARSE';
    prisma.verificacionDocumental.findUnique.mockRejectedValue(
      new Error(privado),
    );
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const respuesta = await request(app.getHttpServer())
        .get(`${base}/verificaciones/${id}`)
        .auth('lector', { type: 'bearer' })
        .expect(500);
      expect(JSON.stringify(respuesta.body)).not.toContain(privado);
      const registros = (log.mock.calls as unknown[][])
        .flat()
        .map((v) => (v instanceof Error ? v.stack : String(v)))
        .join('\n');
      expect(registros).not.toContain(privado);
      expect(respuesta.headers['cache-control']).toBe('private, no-store');
    } finally {
      log.mockRestore();
    }
  });
  it.each(['PDF_UNIFICADO', 'PDF_SEPARADOS'])(
    'registra borrador y autor con modalidad %s sin validar documentos',
    async (modalidadCarga) => {
      const respuesta = await request(app.getHttpServer())
        .post(`${base}/verificaciones`)
        .auth('gestor', { type: 'bearer' })
        .send({
          ...datos,
          nombreCompleto: '  Persona   de Prueba  ',
          modalidadCarga,
        })
        .expect(201);
      expect(respuesta.body).toMatchObject({
        estado: 'BORRADOR',
        nombreCompleto: 'Persona de Prueba',
        creadoPorId: userId,
        modalidadCarga,
        fechaSolicitud: '2026-11-25T00:00:00.000Z',
      });
      expect(prisma.auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: userId,
          entidadId: id,
          accion: 'CREATE',
        }) as unknown,
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    },
  );
  it('admite pasaporte alfanumérico sin perder ceros iniciales', async () => {
    const respuesta = await request(app.getHttpServer())
      .post(`${base}/verificaciones`)
      .auth('gestor', { type: 'bearer' })
      .send({
        ...datos,
        tipoIdentificacion: 'PASAPORTE',
        numeroIdentificacion: '00AB1234',
      })
      .expect(201);
    expect(respuesta.body as unknown).toMatchObject({
      numeroIdentificacion: '00AB1234',
    });
  });
  it.each([
    { estado: 'SATISFACTORIA' },
    { creadoPorId: id },
    { archivos: [] },
    { fechaSolicitud: '2026-02-30' },
    { fechaSolicitud: '2026-11-25T12:00:00Z' },
    { nombreCompleto: '   ' },
    { numeroIdentificacion: '12.345' },
    { tipoIdentificacion: 'INVALIDO' },
    { modalidadCarga: 'INVALIDA' },
  ])(
    'rechaza datos inválidos y asignación de resultados: %j',
    async (cambio) => {
      await request(app.getHttpServer())
        .post(`${base}/verificaciones`)
        .auth('gestor', { type: 'bearer' })
        .send({ ...datos, ...cambio })
        .expect(400);
      expect(prisma.verificacionDocumental.create).not.toHaveBeenCalled();
    },
  );
  it('pagina y filtra el historial por identidad y estado', async () => {
    prisma.verificacionDocumental.count.mockResolvedValue(21);
    const respuesta = await request(app.getHttpServer())
      .get(
        `${base}/verificaciones?pagina=2&limite=20&q=Persona&estado=BORRADOR`,
      )
      .auth('lector', { type: 'bearer' })
      .expect(200);
    expect((respuesta.body as { meta: unknown }).meta).toEqual({
      pagina: 2,
      limite: 20,
      total: 21,
      totalPaginas: 2,
    });
    expect(prisma.verificacionDocumental.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: {
          estado: 'BORRADOR',
          OR: [
            { nombreCompleto: { contains: 'Persona', mode: 'insensitive' } },
            {
              numeroIdentificacion: {
                contains: 'Persona',
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
    );
  });
  it.each(['pagina=0', 'limite=101', 'estado=INVALIDO', 'pagina=abc'])(
    'rechaza paginación/filtros inválidos: %s',
    async (query) => {
      await request(app.getHttpServer())
        .get(`${base}/verificaciones?${query}`)
        .auth('lector', { type: 'bearer' })
        .expect(400);
    },
  );
  it('distingue un UUID inválido de una verificación inexistente', async () => {
    await request(app.getHttpServer())
      .get(`${base}/verificaciones/no-uuid`)
      .auth('lector', { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .get(`${base}/verificaciones/${id}`)
      .auth('lector', { type: 'bearer' })
      .expect(404);
  });
  it('consulta detalle con relaciones y sin seleccionar clave interna ni texto completo', async () => {
    prisma.verificacionDocumental.findUnique.mockResolvedValue({
      id,
      ...datos,
      estado: 'BORRADOR',
      archivos: [],
      hallazgos: [],
    });
    await request(app.getHttpServer())
      .get(`${base}/verificaciones/${id}`)
      .auth('lector', { type: 'bearer' })
      .expect(200);
    const llamadas = prisma.verificacionDocumental.findUnique.mock
      .calls as unknown as Array<
      [
        {
          include: {
            archivos: {
              select: {
                claveAlmacenamiento?: unknown;
                documentos: { select: { textoExtraido?: unknown } };
              };
            };
          };
        },
      ]
    >;
    const query = llamadas[0][0];
    expect(query.include.archivos.select.claveAlmacenamiento).toBeUndefined();
    expect(
      query.include.archivos.select.documentos.select.textoExtraido,
    ).toBeUndefined();
  });
  describe('eliminación individual', () => {
    it.each(['lector', 'gestor', 'soloEliminar', 'ajeno'])(
      'rechaza eliminar a %s',
      async (token) => {
        await request(app.getHttpServer())
          .delete(`${base}/verificaciones/${id}`)
          .auth(token, { type: 'bearer' })
          .expect(403);
        expect(prisma.verificacionDocumental.deleteMany).not.toHaveBeenCalled();
      },
    );
    it('exige autenticación y UUID válido', async () => {
      await request(app.getHttpServer())
        .delete(`${base}/verificaciones/${id}`)
        .expect(401);
      await request(app.getHttpServer())
        .delete(`${base}/verificaciones/invalido`)
        .auth('eliminador', { type: 'bearer' })
        .expect(400);
      expect(prisma.verificacionDocumental.deleteMany).not.toHaveBeenCalled();
    });
    it('elimina solo el id solicitado y audita sin copiar datos personales', async () => {
      const respuesta = await request(app.getHttpServer())
        .delete(`${base}/verificaciones/${id}`)
        .auth('eliminador', { type: 'bearer' })
        .expect(200);
      expect(respuesta.body as unknown).toEqual({ id, eliminado: true });
      expect(prisma.verificacionDocumental.deleteMany).toHaveBeenCalledWith({
        where: { id, estado: { not: 'PROCESANDO' } },
      });
      expect(prisma.auditoria.create).toHaveBeenCalledWith({
        data: {
          usuarioId: userId,
          entidad: 'VerificacionDocumental',
          entidadId: id,
          accion: 'DELETE',
        },
      });
      expect(respuesta.headers['cache-control']).toBe('private, no-store');
    });
    it('responde 404 si ya no existe el registro', async () => {
      prisma.verificacionDocumental.deleteMany.mockResolvedValue({ count: 0 });
      await request(app.getHttpServer())
        .delete(`${base}/verificaciones/${id}`)
        .auth('eliminador', { type: 'bearer' })
        .expect(404);
      expect(prisma.auditoria.create).not.toHaveBeenCalled();
    });
    it('impide borrar un procesamiento activo', async () => {
      prisma.verificacionDocumental.deleteMany.mockResolvedValue({ count: 0 });
      prisma.verificacionDocumental.findUnique.mockResolvedValue({ id });
      await request(app.getHttpServer())
        .delete(`${base}/verificaciones/${id}`)
        .auth('eliminador', { type: 'bearer' })
        .expect(409);
      expect(prisma.auditoria.create).not.toHaveBeenCalled();
    });
    it('no omite ELIMINAR en modo permisivo', async () => {
      process.env.PERMISSIONS_MODE = 'permissive';
      try {
        await request(app.getHttpServer())
          .delete(`${base}/verificaciones/${id}`)
          .auth('gestor', { type: 'bearer' })
          .expect(403);
      } finally {
        process.env.PERMISSIONS_MODE = 'strict';
      }
      expect(prisma.verificacionDocumental.deleteMany).not.toHaveBeenCalled();
    });
  });
  describe('carga multipart de PDF', () => {
    let pdf: Buffer;
    let otroPdf: Buffer;
    let protegido: Buffer;
    beforeAll(async () => {
      const crearPdf = async (titulo: string) => {
        const documento = await PDFDocument.create();
        documento.addPage();
        documento.setTitle(titulo);
        return Buffer.from(await documento.save());
      };
      pdf = await crearPdf('Uno');
      otroPdf = await crearPdf('Dos');
      const documento = await PDFDocument.create();
      documento.addPage();
      documento.context.trailerInfo.Encrypt = documento.context.register(
        documento.context.obj({ Filter: PDFName.of('Standard') }),
      );
      protegido = Buffer.from(await documento.save());
    });
    function preparar(modalidadCarga = 'PDF_UNIFICADO') {
      prisma.verificacionDocumental.findUnique
        .mockResolvedValueOnce({
          id,
          estado: 'BORRADOR',
          modalidadCarga,
          archivos: [],
        })
        .mockResolvedValue({
          id,
          ...datos,
          modalidadCarga,
          estado: 'INCOMPLETA',
          archivos: [
            { id: 'archivo', nombreOriginal: 'prueba.pdf', numeroPaginas: 1 },
          ],
          hallazgos: [{ codigo: 'REVISION_DOCUMENTAL_PENDIENTE' }],
        });
    }
    const cargar = () =>
      request(app.getHttpServer())
        .post(`${base}/verificaciones/${id}/procesar`)
        .auth('gestor', { type: 'bearer' });
    it('descarta el buffer incluso si el borrador no existe', async () => {
      const buffer = Buffer.from(pdf);
      const archivo = {
        originalname: 'prueba.pdf',
        mimetype: 'application/pdf',
        size: buffer.length,
        buffer,
      };
      await expect(
        app.get(VerificadorDocumentalService).procesar(id, [archivo], userId),
      ).rejects.toThrow('no encontrada');
      expect(archivo.buffer.length).toBe(0);
      expect(archivo.size).toBe(0);
      expect(buffer.every((b) => b === 0)).toBe(true);
    });
    it('no reutiliza resultados al reenviar los mismos documentos a una verificación finalizada', async () => {
      prisma.verificacionDocumental.findUnique.mockResolvedValue({
        id,
        ...datos,
        estado: 'INCOMPLETA',
        archivos: [{ sha256: createHash('sha256').update(pdf).digest('hex') }],
      });
      const respuesta = await cargar()
        .attach('archivos', pdf, 'prueba.pdf')
        .expect(409);
      expect(JSON.stringify(respuesta.body)).toContain(
        'adjunte todos los documentos nuevamente',
      );
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('recibe PDF real, guarda solo resultados/metadatos y devuelve resultado incompleto', async () => {
      preparar();
      const respuesta = await cargar()
        .attach('archivos', pdf, {
          filename: 'prueba.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      expect(respuesta.body as unknown).toMatchObject({
        estado: 'INCOMPLETA',
        hallazgos: [{ codigo: 'REVISION_DOCUMENTAL_PENDIENTE' }],
      });
      const llamadas = prisma.archivoVerificacionDocumental.createMany.mock
        .calls as unknown as Array<
        [
          {
            data: Array<{
              nombreOriginal: string;
              numeroPaginas: number;
              sha256: string;
            }>;
          },
        ]
      >;
      expect(llamadas[0][0].data[0]).not.toHaveProperty('contenido');
      expect(llamadas[0][0].data[0]).not.toHaveProperty('claveAlmacenamiento');
      const documentos = prisma.documentoVerificacionDocumental.createMany.mock
        .calls as unknown as Array<[{ data: object[] }]>;
      for (const doc of documentos[0][0].data) {
        expect(doc).not.toHaveProperty('textoExtraido');
        expect(doc).not.toHaveProperty('camposExtraidos');
      }
      expect(llamadas[0][0].data[0].numeroPaginas).toBe(1);
      expect(llamadas[0][0].data[0].sha256).toHaveLength(64);
    });
    it('recibe varios PDF individuales en el mismo envío', async () => {
      preparar('PDF_SEPARADOS');
      await cargar()
        .attach('archivos', pdf, 'primero.pdf')
        .attach('archivos', otroPdf, 'segundo.PDF')
        .expect(201);
      const llamadas = prisma.archivoVerificacionDocumental.createMany.mock
        .calls as unknown as Array<[{ data: unknown[] }]>;
      expect(llamadas[0][0].data).toHaveLength(2);
    });
    it('no permite cargar a un lector', async () => {
      await request(app.getHttpServer())
        .post(`${base}/verificaciones/${id}/procesar`)
        .auth('lector', { type: 'bearer' })
        .attach('archivos', pdf, 'prueba.pdf')
        .expect(403);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('rechaza la carga sin archivos y el borrador inexistente', async () => {
      preparar();
      await cargar().expect(400);
      prisma.verificacionDocumental.findUnique
        .mockReset()
        .mockResolvedValue(null);
      await cargar().attach('archivos', pdf, 'prueba.pdf').expect(404);
    });
    it('rechaza varios archivos en modalidad unificada', async () => {
      preparar();
      await cargar()
        .attach('archivos', pdf, 'uno.pdf')
        .attach('archivos', otroPdf, 'dos.pdf')
        .expect(400);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it.each([
      ['documento.exe', 'application/pdf', 'valido'],
      ['documento.pdf', 'image/png', 'valido'],
      ['documento.pdf', 'application/pdf', 'falso'],
      ['documento.pdf', 'application/pdf', 'estructura'],
      ['documento.pdf', 'application/pdf', 'truncado'],
      ['documento.pdf', 'application/pdf', 'vacio'],
      ['documento.pdf', 'application/pdf', 'protegido'],
    ])(
      'rechaza %s / %s / %s sin guardar archivos',
      async (filename, contentType, caso) => {
        preparar();
        const contenido =
          caso === 'falso'
            ? Buffer.from('imagen falsa')
            : caso === 'estructura'
              ? Buffer.from('%PDF-1.7\nesto no es un PDF\n%%EOF')
              : caso === 'truncado'
                ? pdf.subarray(0, pdf.length - 15)
                : caso === 'vacio'
                  ? Buffer.alloc(0)
                  : caso === 'protegido'
                    ? protegido
                    : pdf;
        await cargar()
          .attach('archivos', contenido, { filename, contentType })
          .expect(400);
        expect(
          prisma.archivoVerificacionDocumental.createMany,
        ).not.toHaveBeenCalled();
      },
    );
    it('rechaza duplicados aunque sus nombres sean distintos', async () => {
      preparar('PDF_SEPARADOS');
      await cargar()
        .attach('archivos', pdf, 'uno.pdf')
        .attach('archivos', pdf, 'copia.pdf')
        .expect(400);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('impone el límite de tamaño desde el interceptor HTTP', async () => {
      preparar();
      await cargar()
        .attach(
          'archivos',
          Buffer.alloc(LIMITES_CARGA.maxArchivoBytes + 1),
          'grande.pdf',
        )
        .expect(413);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('impone el máximo de archivos desde el interceptor HTTP', async () => {
      preparar('PDF_SEPARADOS');
      const consulta = cargar();
      for (let n = 0; n < LIMITES_CARGA.maxArchivos + 1; n++)
        consulta.attach('archivos', pdf, `${n}.pdf`);
      await consulta.expect(400);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('acepta exactamente el máximo de veinte PDF diferentes', async () => {
      preparar('PDF_SEPARADOS');
      const consulta = cargar();
      for (let n = 0; n < LIMITES_CARGA.maxArchivos; n++) {
        const documento = await PDFDocument.create();
        documento.addPage();
        documento.setTitle(`Documento ${n}`);
        consulta.attach(
          'archivos',
          Buffer.from(await documento.save()),
          `${n}.pdf`,
        );
      }
      await consulta.expect(201);
    }, 20000);
    it('rechaza el total excesivo antes de parsear o guardar', async () => {
      const grande = Buffer.alloc(LIMITES_CARGA.maxArchivoBytes);
      const archivo = {
        originalname: 'grande.pdf',
        mimetype: 'application/pdf',
        buffer: grande,
        size: grande.length,
      };
      await expect(
        new PdfValidationService().validar(
          [archivo, archivo, archivo, archivo],
          'PDF_SEPARADOS',
        ),
      ).rejects.toThrow('60 MB');
    });
    it('rechaza más de 60 MB durante la recepción HTTP y antes de consultar el borrador', async () => {
      const parte = Buffer.alloc(16 * 1024 * 1024);
      const consulta = cargar();
      for (let n = 0; n < 4; n++)
        consulta.attach('archivos', parte, `${n}.pdf`);
      await consulta.expect(413);
      expect(prisma.verificacionDocumental.findUnique).not.toHaveBeenCalled();
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    }, 15000);
    it('evita sobrescribir una verificación procesada', async () => {
      prisma.verificacionDocumental.findUnique.mockResolvedValue({
        id,
        estado: 'INCOMPLETA',
        modalidadCarga: 'PDF_UNIFICADO',
        archivos: [{ sha256: 'otro' }],
      });
      await cargar().attach('archivos', pdf, 'prueba.pdf').expect(409);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('evita escrituras cuando otro envío tomó el borrador', async () => {
      preparar();
      prisma.verificacionDocumental.updateMany.mockResolvedValue({ count: 0 });
      await cargar().attach('archivos', pdf, 'prueba.pdf').expect(409);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
    it('rechaza campos multipart y nombres de campo inesperados', async () => {
      preparar();
      await cargar()
        .field('estado', 'SATISFACTORIA')
        .attach('archivos', pdf, 'prueba.pdf')
        .expect(400);
      preparar();
      await cargar().attach('otroCampo', pdf, 'prueba.pdf').expect(400);
      expect(
        prisma.archivoVerificacionDocumental.createMany,
      ).not.toHaveBeenCalled();
    });
  });
});
