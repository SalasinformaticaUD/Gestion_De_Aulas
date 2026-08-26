import { EstadoMulta } from '../../generated/prisma/enums.js';
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
});
