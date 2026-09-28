import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { ImportacionSolicitudesService } from './importacion-solicitudes.service';
import type { NormalizacionSolicitudesService } from './normalizacion-solicitudes.service';

describe('ImportacionSolicitudesService', () => {
  it('rechaza una carga repetida usando la huella del archivo', async () => {
    const prisma = {
      importacionSolicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'importacion-existente',
          estado: 'COMPLETA',
          creadoEn: new Date(),
        }),
      },
    } as unknown as PrismaService;
    const servicio = new ImportacionSolicitudesService(
      prisma,
      {} as NormalizacionSolicitudesService,
    );

    await expect(
      servicio.importarExcel({
        buffer: Buffer.from('mismo contenido'),
        originalname: 'respuestas.xlsx',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('omite solicitudes con el mismo docente y las mismas respuestas', async () => {
    const tx = {
      importacionSolicitudInstalacion: {
        create: jest.fn().mockResolvedValue({
          id: 'importacion-1',
          nombreArchivo: 'respuestas.xlsx',
          totalFilas: 2,
          solicitudesCreadas: 1,
          filasObservadas: 0,
          filasRechazadas: 0,
          estado: 'PARCIAL',
        }),
      },
      solicitudInstalacion: { create: jest.fn() },
      auditoria: { create: jest.fn() },
    };
    const prisma = {
      importacionSolicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((callback: (cliente: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const solicitudBase = {
      hashContenido: 'hash-nuevo',
      filaOrigen: 2,
      identificadorOrigen: 'R-1',
      fechaInicioFormulario: null,
      fechaPeticion: new Date('2026-09-10'),
      correoRespondienteOriginal: null,
      nombreRespondienteOriginal: null,
      docenteNombreOriginal: 'Ana Ruiz',
      docenteCorreoOriginal: 'ana@udistrital.edu.co',
      proyectoCurricularOriginal: 'INGENIERÍA DE SISTEMAS',
      observacionGeneral: null,
      consentimientoDatos: true,
      historicaAlImportar: false,
      motivoHistorialInicial: null,
      alertas: [],
      datosOriginales: {},
      items: [],
      docenteId: null,
      proyectoCurricularId: null,
      periodoId: 'periodo-1',
      duplicados: [],
      itemsNormalizados: [],
    };
    const normalizacion = {
      normalizar: jest.fn().mockResolvedValue({
        solicitudesNormalizadas: [
          solicitudBase,
          {
            ...solicitudBase,
            hashContenido: 'hash-duplicado',
            filaOrigen: 3,
            duplicados: ['solicitud-existente'],
          },
        ],
      }),
    } as unknown as NormalizacionSolicitudesService;
    const servicio = new ImportacionSolicitudesService(prisma, normalizacion);
    Reflect.set(
      servicio,
      'leerArchivo',
      jest.fn().mockReturnValue({
        totalFilas: 2,
        solicitudes: [{}, {}],
        errores: [],
      }),
    );

    const resultado = await servicio.importarExcel({
      buffer: Buffer.from('contenido nuevo'),
      originalname: 'respuestas.xlsx',
    });

    expect(tx.solicitudInstalacion.create).toHaveBeenCalledTimes(1);
    expect(tx.importacionSolicitudInstalacion.create).toHaveBeenCalledTimes(1);
    expect(resultado.resumen).toMatchObject({
      solicitudesCreadas: 1,
      filasDuplicadas: 1,
    });
  });
});
