import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL =
      'postgresql://usuario:clave@localhost:5432/pruebas';
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalUrl;
  });

  it('conecta y desconecta mediante los hooks del módulo', async () => {
    const service = new PrismaService();
    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
