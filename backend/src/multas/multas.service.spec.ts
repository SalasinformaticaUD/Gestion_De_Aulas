import { EstadoMulta } from '../../generated/prisma/enums.js';
import * as XLSX from 'xlsx';
import { MultasService } from './multas.service';

describe('MultasService', () => {
  it('localiza exclusivamente multas activas del estudiante', async () => {
    const prisma = {
      multa: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'multa',
          fecha: new Date(),
          motivo: { nombre: 'Daño' },
        }),
      },
    };
    const service = new MultasService(prisma as never);
    await expect(
      service.tieneMultaActiva('00000000-0000-4000-8000-000000000001'),
    ).resolves.toEqual(expect.objectContaining({ id: 'multa' }));
    expect(prisma.multa.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estudianteId: '00000000-0000-4000-8000-000000000001',
          estado: EstadoMulta.ACTIVA,
        },
      }),
    );
  });

  it('consulta una plantilla XLSX que solo contiene la columna Codigo', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Codigo: '20261001' },
        { Codigo: '20261002' },
      ]),
      'Codigos',
    );
    const prisma = {
      estudiante: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'estudiante-1',
            codigo: '20261001',
            nombre: 'Estudiante con multa',
            multas: [
              {
                id: 'multa-1',
                fecha: new Date(),
                estado: EstadoMulta.ACTIVA,
                descripcion: null,
                motivo: { nombre: 'No entregó el aula' },
              },
            ],
          },
        ]),
      },
    };
    const service = new MultasService(prisma as never);

    const result = await service.buscarMasivo({
      buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
      originalname: 'codigos.xlsx',
    });

    expect(result).toMatchObject({
      conMulta: 1,
      sinMulta: 0,
      noEncontradas: 1,
      resultados: [
        { codigo: '20261001', estado: 'CON_MULTA' },
        { codigo: '20261002', estado: 'NO_ENCONTRADO' },
      ],
    });
  });
});
