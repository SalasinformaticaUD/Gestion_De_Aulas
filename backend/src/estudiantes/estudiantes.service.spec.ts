import * as XLSX from 'xlsx';
import { EstudiantesService } from './estudiantes.service';

describe('EstudiantesService', () => {
  it('reactiva el nombre al encontrarlo en la actualización semestral', async () => {
    const tx = {
      estudiante: {
        findUnique: jest.fn().mockResolvedValue({ id: 'estudiante-1' }),
        upsert: jest.fn().mockResolvedValue({ id: 'estudiante-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Codigo: '2023999999', Nombre: '(INACTIVO) ESTUDIANTE HISTÓRICO', Correo: 'historico@udistrital.edu.co' },
      ]),
      'Estudiantes',
    );
    const service = new EstudiantesService(prisma as never);

    await expect(
      service.importarExcel({
        buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
        originalname: 'estudiantes-semestral.xlsx',
      }),
    ).resolves.toMatchObject({ total: 1, creados: 0, actualizados: 1 });
    expect(tx.estudiante.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { nombre: 'ESTUDIANTE HISTÓRICO', correo: 'historico@udistrital.edu.co' },
      }),
    );
  });
});
