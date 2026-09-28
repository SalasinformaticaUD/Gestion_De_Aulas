/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import type { PrismaService } from '../prisma/prisma.service';
import type { TareasOperativasService } from '../tareas-operativas/tareas-operativas.service';
import { GeneracionTareasInstalacionService } from './generacion-tareas-instalacion.service';

const solicitud = {
  id: 'solicitud-1',
  estado: 'PENDIENTE_REVISION',
  consentimientoDatos: true,
  docenteNombreOriginal: 'Docente original',
  proyectoCurricularOriginal: 'Proyecto original',
  observacionGeneral: null,
  docente: { nombre: 'Ana Docente' },
  proyectoCurricular: { nombre: 'Ingeniería' },
  items: [
    {
      id: 'item-1',
      asignaturaOriginal: 'Bases de Datos',
      observaciones: null,
      asignatura: { nombre: 'Bases de Datos' },
      aulas: [
        {
          id: 'item-aula-1',
          aulaId: 'aula-1',
          valorOriginal: 'Lab 1',
          valorNormalizado: 'LAB 1',
          estado: 'COINCIDENCIA',
          aula: { codigo: '101' },
        },
        {
          id: 'item-aula-2',
          aulaId: 'aula-2',
          valorOriginal: 'Lab 2',
          valorNormalizado: 'LAB 2',
          estado: 'COINCIDENCIA',
          aula: { codigo: '102' },
        },
      ],
      softwareSolicitado: [
        {
          id: 'programa-1',
          softwareId: 'software-1',
          nombreOriginal: 'Postgres',
          nombreNormalizado: 'PostgreSQL',
          versionNormalizada: '16',
          estado: 'COINCIDENCIA',
          software: { nombre: 'PostgreSQL', version: '16' },
          tareasGeneradas: [],
        },
      ],
    },
  ],
};

const dto = {
  items: [
    {
      itemId: 'item-1',
      software: [
        {
          softwareSolicitadoId: 'programa-1',
          aulaIds: ['item-aula-1', 'item-aula-2'],
        },
      ],
    },
  ],
};

describe('GeneracionTareasInstalacionService', () => {
  it('crea una tarea por software y aula en una aprobación total', async () => {
    const tx = {
      solicitudSoftwareTarea: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      solicitudInstalacion: { update: jest.fn().mockResolvedValue({}) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      solicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue(solicitud),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService;
    const tareas = {
      crearDesdeIntegracion: jest
        .fn()
        .mockResolvedValueOnce({ id: 'tarea-1' })
        .mockResolvedValueOnce({ id: 'tarea-2' }),
    } as unknown as TareasOperativasService;

    const resultado = await new GeneracionTareasInstalacionService(
      prisma,
      tareas,
    ).aprobar('solicitud-1', dto, 'usuario-1');

    expect(resultado.aprobacion).toBe('TOTAL');
    expect(resultado.creadas).toHaveLength(2);
    expect(tareas.crearDesdeIntegracion).toHaveBeenCalledTimes(2);
    const primera = (tareas.crearDesdeIntegracion as jest.Mock).mock
      .calls[0][1];
    const segunda = (tareas.crearDesdeIntegracion as jest.Mock).mock
      .calls[1][1];
    expect(primera.grupoId).toBeTruthy();
    expect(segunda.grupoId).toBe(primera.grupoId);
    expect(tx.solicitudInstalacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'APROBADA' }),
      }),
    );
  });

  it('reutiliza relaciones existentes al repetir la aprobación', async () => {
    const tx = {
      solicitudSoftwareTarea: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ tareaId: 'tarea-1' })
          .mockResolvedValueOnce({ tareaId: 'tarea-2' }),
        create: jest.fn(),
      },
      solicitudInstalacion: { update: jest.fn().mockResolvedValue({}) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      solicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue(solicitud),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService;
    const tareas = {
      crearDesdeIntegracion: jest.fn(),
    } as unknown as TareasOperativasService;

    const resultado = await new GeneracionTareasInstalacionService(
      prisma,
      tareas,
    ).aprobar('solicitud-1', dto, 'usuario-1');

    expect(resultado.creadas).toHaveLength(0);
    expect(resultado.existentes).toHaveLength(2);
    expect(tareas.crearDesdeIntegracion).not.toHaveBeenCalled();
    expect(tx.solicitudSoftwareTarea.create).not.toHaveBeenCalled();
  });

  it('marca como parcial cuando solo se aprueba una de las aulas', async () => {
    const tx = {
      solicitudSoftwareTarea: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      solicitudInstalacion: { update: jest.fn().mockResolvedValue({}) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      solicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue(solicitud),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService;
    const tareas = {
      crearDesdeIntegracion: jest.fn().mockResolvedValue({ id: 'tarea-1' }),
    } as unknown as TareasOperativasService;
    const parcial = {
      items: [
        {
          itemId: 'item-1',
          software: [
            {
              softwareSolicitadoId: 'programa-1',
              aulaIds: ['item-aula-1'],
            },
          ],
        },
      ],
    };

    const resultado = await new GeneracionTareasInstalacionService(
      prisma,
      tareas,
    ).aprobar('solicitud-1', parcial, 'usuario-1');

    expect(resultado.aprobacion).toBe('PARCIAL');
    expect(tx.solicitudInstalacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'APROBADA_PARCIAL' }),
      }),
    );
  });

  it('permite aprobar software nuevo sin relación con el catálogo', async () => {
    const softwareNuevo = {
      ...solicitud,
      consentimientoDatos: false,
      items: solicitud.items.map((item) => ({
        ...item,
        softwareSolicitado: item.softwareSolicitado.map((programa) => ({
          ...programa,
          softwareId: null,
          software: null,
          estado: 'NUEVO',
          nombreNormalizado: 'Software solicitado por el docente',
          versionNormalizada: null,
        })),
      })),
    };
    const prisma = {
      solicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue(softwareNuevo),
      },
    } as unknown as PrismaService;
    const servicio = new GeneracionTareasInstalacionService(
      prisma,
      {} as TareasOperativasService,
    );

    const resultado = await servicio.previsualizar('solicitud-1', dto);
    expect(resultado.tareas).toHaveLength(2);
    expect(resultado.tareas[0]).toMatchObject({
      software: 'Software solicitado por el docente',
    });
  });
});
