import {
  crearHashContenidoSolicitud,
  NormalizacionSolicitudesService,
  normalizarClave,
} from './normalizacion-solicitudes.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ResultadoLecturaSolicitudesExcel } from './solicitudes-instalacion-excel.parser';

describe('NormalizacionSolicitudesService', () => {
  it('estandariza tildes, signos y espacios', () => {
    expect(normalizarClave('  Programación   básica (2026) ')).toBe(
      'PROGRAMACION BASICA 2026',
    );
  });

  it('resuelve catálogos y aliases sin perder valores originales', async () => {
    const findManySolicitudes = jest.fn();
    const prisma = {
      docente: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'd1', nombre: 'Ana Ruiz', correo: 'ana@udistrital.edu.co' },
          ]),
      },
      proyectoCurricular: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'p1', nombre: 'Ingeniería de Sistemas' }]),
      },
      asignatura: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'as1',
            nombre: 'Bases de Datos',
            codigo: 'BD101',
            proyectoCurricularId: 'p1',
          },
        ]),
      },
      aula: {
        findMany: jest.fn().mockResolvedValue([{ id: 'a1', codigo: '405' }]),
      },
      software: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 's1', nombre: 'PostgreSQL', version: '16' },
          ]),
      },
      aliasAula: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ aliasNormalizado: 'LAB 405', aulaId: 'a1' }]),
      },
      aliasSoftware: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { aliasNormalizado: 'POSTGRES', softwareId: 's1' },
          ]),
      },
      periodoAcademico: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pe1',
            fechaInicio: new Date('2026-08-01'),
            fechaFin: new Date('2026-12-20'),
          },
        ]),
      },
      solicitudInstalacion: {
        findMany: findManySolicitudes,
      },
    } as unknown as PrismaService;
    const lectura: ResultadoLecturaSolicitudesExcel = {
      totalFilas: 1,
      errores: [],
      solicitudes: [
        {
          filaOrigen: 2,
          identificadorOrigen: 'R-1',
          fechaInicioFormulario: null,
          fechaPeticion: new Date('2026-09-10'),
          correoRespondienteOriginal: null,
          nombreRespondienteOriginal: null,
          docenteNombreOriginal: 'ANA RUIZ',
          docenteCorreoOriginal: 'ANA@UDISTRITAL.EDU.CO',
          proyectoCurricularOriginal: 'Ingenieria de Sistemas',
          observacionGeneral: null,
          consentimientoDatos: null,
          alertas: [],
          datosOriginales: { docente: 'ANA RUIZ' },
          items: [
            {
              posicion: 1,
              asignaturaOriginal: 'bases de datos',
              observaciones: null,
              aulasOriginales: ['Lab 405'],
              software: [{ posicion: 1, nombreOriginal: 'Postgres' }],
              alertas: [],
              datosOriginales: { software: 'Postgres' },
            },
          ],
        },
      ],
    };
    findManySolicitudes.mockResolvedValue([
      {
        id: 'existente',
        hashContenido: crearHashContenidoSolicitud(
          lectura.solicitudes[0],
          'pe1',
        ),
      },
    ]);

    const resultado = await new NormalizacionSolicitudesService(
      prisma,
    ).normalizar(lectura);
    const solicitud = resultado.solicitudesNormalizadas[0];
    expect(solicitud.docenteId).toBe('d1');
    expect(solicitud.proyectoCurricularId).toBeNull();
    expect(solicitud.periodoId).toBe('pe1');
    expect(solicitud.itemsNormalizados[0].asignaturaId).toBeNull();
    expect(solicitud.itemsNormalizados[0].aulas[0]).toMatchObject({
      aulaId: 'a1',
      estado: 'COINCIDENCIA',
    });
    expect(solicitud.itemsNormalizados[0].software[0]).toMatchObject({
      softwareId: null,
      nombreNormalizado: 'Postgres',
      estado: 'NUEVO',
    });
    expect(solicitud.items[0].software[0].nombreOriginal).toBe('Postgres');
    expect(solicitud.duplicados).toEqual(['existente']);
  });

  it('genera la misma huella para respuestas equivalentes del mismo periodo', () => {
    const base = {
      docenteNombreOriginal: 'Ana Ruiz',
      docenteCorreoOriginal: 'ana@udistrital.edu.co',
      proyectoCurricularOriginal: 'Ingeniería de Sistemas',
      observacionGeneral: null,
      items: [
        {
          posicion: 1,
          asignaturaOriginal: 'Bases de datos',
          observaciones: null,
          aulasOriginales: ['405', '406'],
          software: [{ posicion: 1, nombreOriginal: 'PostgreSQL' }],
          alertas: [],
          datosOriginales: {},
        },
      ],
    };
    const equivalente = {
      ...base,
      docenteNombreOriginal: 'ANA RUIZ',
      proyectoCurricularOriginal: 'INGENIERIA DE SISTEMAS',
      items: [
        {
          ...base.items[0],
          aulasOriginales: ['406', '405'],
          software: [{ posicion: 1, nombreOriginal: ' postgresql ' }],
        },
      ],
    };

    expect(crearHashContenidoSolicitud(base, 'periodo-1')).toBe(
      crearHashContenidoSolicitud(equivalente, 'periodo-1'),
    );
    expect(crearHashContenidoSolicitud(base, 'periodo-1')).not.toBe(
      crearHashContenidoSolicitud(equivalente, 'periodo-2'),
    );
  });
});
