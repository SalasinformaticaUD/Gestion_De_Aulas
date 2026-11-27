import * as XLSX from 'xlsx';
import { EstudiantesService } from './estudiantes.service';

describe('EstudiantesService', () => {
  it('clasifica una búsqueda masiva sin modificar estudiantes', async () => {
    const prisma = {
      estudiante: {
        findMany: jest.fn().mockResolvedValue([
          {
            codigo: '2026000001',
            nombre: 'ESTUDIANTE ACTIVO',
            correo: 'activo@udistrital.edu.co',
            proyectoCurricular: 'INGENIERÍA DE SISTEMAS',
          },
          {
            codigo: '2025000002',
            nombre: '(INACTIVO) ESTUDIANTE HISTÓRICO',
            correo: 'historico@udistrital.edu.co',
            proyectoCurricular: 'INGENIERÍA INDUSTRIAL',
          },
        ]),
      },
    };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Correo: 'ACTIVO@udistrital.edu.co' },
        { Correo: 'historico@udistrital.edu.co' },
        { Correo: 'noexiste@udistrital.edu.co' },
        { Correo: 'activo@udistrital.edu.co' },
      ]),
      'Correos',
    );
    const service = new EstudiantesService(prisma as never);

    await expect(
      service.buscarMasivo({
        buffer: XLSX.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        }) as Buffer,
        originalname: 'consulta-estudiantes.xlsx',
      }),
    ).resolves.toMatchObject({
      totalFilas: 4,
      procesados: 3,
      duplicados: 1,
      activos: 1,
      inactivos: 2,
      resultados: [
        {
          correo: 'activo@udistrital.edu.co',
          codigo: '2026000001',
          proyectoCurricular: 'INGENIERÍA DE SISTEMAS',
          estado: 'ACTIVO',
        },
        {
          correo: 'historico@udistrital.edu.co',
          codigo: '2025000002',
          nombre: 'ESTUDIANTE HISTÓRICO',
          proyectoCurricular: 'INGENIERÍA INDUSTRIAL',
          estado: 'INACTIVO',
        },
        {
          correo: 'noexiste@udistrital.edu.co',
          codigo: null,
          proyectoCurricular: null,
          estado: 'INACTIVO',
        },
      ],
    });
    expect(prisma.estudiante.findMany).toHaveBeenCalledTimes(1);
  });

  it('reactiva el nombre al encontrarlo en la actualización semestral', async () => {
    const tx = {
      estudiante: {
        findUnique: jest.fn().mockResolvedValue({ id: 'estudiante-1' }),
        upsert: jest.fn().mockResolvedValue({ id: 'estudiante-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        {
          Codigo: '2023999999',
          Nombre: '(INACTIVO) ESTUDIANTE HISTÓRICO',
          Correo: 'historico@udistrital.edu.co',
        },
      ]),
      'Estudiantes',
    );
    const service = new EstudiantesService(prisma as never);

    await expect(
      service.importarExcel({
        buffer: XLSX.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        }) as Buffer,
        originalname: 'estudiantes-semestral.xlsx',
      }),
    ).resolves.toMatchObject({ total: 1, creados: 0, actualizados: 1 });
    expect(tx.estudiante.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          nombre: 'ESTUDIANTE HISTÓRICO',
          correo: 'historico@udistrital.edu.co',
        },
      }),
    );
  });
});
