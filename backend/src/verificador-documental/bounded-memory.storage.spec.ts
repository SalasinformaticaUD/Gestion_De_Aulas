import { PassThrough } from 'node:stream';
import { BoundedMemoryStorage } from './bounded-memory.storage';

describe('Carga acotada en memoria, sin archivos temporales', () => {
  it('conserva los bytes exactos y permite liberar el buffer', async () => {
    const storage = new BoundedMemoryStorage(),
      stream = new PassThrough();
    const info = await new Promise<{ buffer: Buffer; size: number }>(
      (resolve, reject) => {
        storage._handleFile({}, { stream }, (error, data) =>
          error ? reject(error) : resolve(data!),
        );
        stream.end(Buffer.from('contenido original'));
      },
    );
    expect(info.buffer.toString()).toBe('contenido original');
    expect(info.size).toBe(18);
    const file = { ...info, stream };
    storage._removeFile({}, file, (error) => expect(error).toBeNull());
    expect(file.buffer).toBeUndefined();
  });
  it('comparte el presupuesto entre archivos de la misma petición y aísla otras peticiones', async () => {
    const storage = new BoundedMemoryStorage(),
      req = {};
    const chunk = Buffer.alloc(1024 * 1024);
    const cargar = (request: object, mb: number) =>
      new Promise<Error | null>((resolve) => {
        const stream = new PassThrough();
        storage._handleFile(request, { stream }, (error) => resolve(error));
        for (let i = 0; i < mb; i++) stream.write(chunk);
        stream.end();
      });
    for (let i = 0; i < 3; i++) expect(await cargar(req, 20)).toBeNull();
    expect((await cargar(req, 1))?.message).toContain('60 MB');
    expect(await cargar({}, 1)).toBeNull();
  });
  it('interrumpe un archivo mayor a 20 MB y no invoca dos veces el callback', async () => {
    const storage = new BoundedMemoryStorage(),
      stream = new PassThrough();
    const callback = jest.fn<
      void,
      [Error | null, { buffer: Buffer; size: number }?]
    >();
    storage._handleFile({}, { stream }, callback);
    stream.write(Buffer.alloc(20 * 1024 * 1024));
    stream.end(Buffer.from('exceso'));
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(callback).toHaveBeenCalledTimes(1);
    expect((callback.mock.calls[0][0] as Error).message).toContain('20 MB');
  });
  it('descarta cargas cerradas sin terminar', async () => {
    const storage = new BoundedMemoryStorage(),
      stream = new PassThrough();
    const error = await new Promise<Error | null>((resolve) => {
      storage._handleFile({}, { stream }, (e) => resolve(e));
      stream.write(Buffer.from('parcial'));
      stream.destroy();
    });
    expect(error?.message).toContain('interrumpió');
  });
});
