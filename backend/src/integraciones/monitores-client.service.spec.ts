import { MonitoresClientService } from './monitores-client.service';

describe('MonitoresClientService', () => {
  const service = new MonitoresClientService();
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.MONITORES_API_URL = 'http://monitores.test';
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.MONITORES_API_URL;
  });

  it('consulta el estado de la API de Monitores', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );
    await expect(service.estado()).resolves.toEqual({
      disponible: true,
      servicio: 'monitores',
      detalle: 'ok',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://monitores.test/health',
      expect.any(Object),
    );
  });

  it('representa un usuario remoto inexistente sin lanzar error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    await expect(
      service.buscarUsuario('00000000-0000-4000-8000-000000000001'),
    ).resolves.toMatchObject({ existe: false });
  });
});
