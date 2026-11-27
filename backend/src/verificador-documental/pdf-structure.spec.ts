import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';
import { contarPaginasPdf } from './pdf-structure';

jest.mock('node:worker_threads', () => ({ Worker: jest.fn() }));

describe('Aislamiento del parser estructural de PDF', () => {
  let worker: EventEmitter & { terminate: jest.Mock<Promise<number>, []> };
  beforeEach(() => {
    jest.useFakeTimers();
    worker = Object.assign(new EventEmitter(), {
      terminate: jest.fn<Promise<number>, []>(() => Promise.resolve(0)),
    });
    jest
      .mocked(Worker)
      .mockReset()
      .mockImplementation(() => worker as unknown as Worker);
  });
  afterEach(() => jest.useRealTimers());
  it('limita memoria, páginas y logs del worker', async () => {
    const resultado = contarPaginasPdf(Buffer.from('contenido'));
    const options = jest.mocked(Worker).mock.calls[0][1];
    expect(options?.resourceLimits?.maxOldGenerationSizeMb).toBe(256);
    expect(options?.stdout).toBe(true);
    expect(options?.stderr).toBe(true);
    worker.emit('message', 9);
    expect(await resultado).toBe(9);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it('cancela y falla de forma cerrada al vencer el tiempo', async () => {
    const resultado = contarPaginasPdf(Buffer.from('contenido'));
    jest.advanceTimersByTime(10000);
    expect(await resultado).toBeNull();
    worker.emit('message', 9);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, 501, 1.5, null, '9', {}])(
    'rechaza una respuesta no válida %j',
    async (value) => {
      const resultado = contarPaginasPdf(Buffer.from('contenido'));
      worker.emit('message', value);
      expect(await resultado).toBeNull();
    },
  );
  it('un error de parser no produce un falso resultado válido', async () => {
    const resultado = contarPaginasPdf(Buffer.from('contenido'));
    worker.emit('error', new Error('parser'));
    expect(await resultado).toBeNull();
  });
});
