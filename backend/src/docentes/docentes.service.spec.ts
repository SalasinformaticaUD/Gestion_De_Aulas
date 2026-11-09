import * as XLSX from 'xlsx';
import { DocentesService } from './docentes.service';

describe('DocentesService', () => {
  it('importa y normaliza el correo opcional del docente', async () => {
    const tx = {
      docente: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'docente-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
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
          CEDULA: '123456789',
          NOMBRE: 'DOCENTE DE PRUEBA',
          CORREO: 'Docente@Udistrital.edu.co',
          PROYECTO: 'INGENIERÍA DE SISTEMAS',
        },
      ]),
      'Docentes',
    );
    const service = new DocentesService(prisma as never);

    await expect(
      service.importarExcel({
        buffer: XLSX.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        }) as Buffer,
        originalname: 'docentes.xlsx',
      }),
    ).resolves.toMatchObject({ total: 1, creados: 1, actualizados: 0 });
    expect(tx.docente.upsert).toHaveBeenCalledWith({
      where: { documento: '123456789' },
      update: {
        nombre: 'DOCENTE DE PRUEBA',
        correo: 'docente@udistrital.edu.co',
        proyecto: 'INGENIERÍA DE SISTEMAS',
      },
      create: {
        documento: '123456789',
        nombre: 'DOCENTE DE PRUEBA',
        correo: 'docente@udistrital.edu.co',
        proyecto: 'INGENIERÍA DE SISTEMAS',
      },
    });
  });
});
