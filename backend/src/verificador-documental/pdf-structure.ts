import { Worker } from 'node:worker_threads';
import { LIMITES_CARGA } from './verificador-documental.constants';

const WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
const { PDFDocument } = require(workerData.modulePath);
(async () => {
  const pdf = await PDFDocument.load(new Uint8Array(workerData.bytes), {
    ignoreEncryption:false, throwOnInvalidObject:true, updateMetadata:false
  });
  const count = pdf.getPageCount();
  if (!count || count > workerData.maxPages) throw new Error('PAGES');
  for (const page of pdf.getPages()) page.getSize();
  parentPort.postMessage(count);
})().catch(() => parentPort.postMessage(null));
`;

// También el parser estructural procesa contenido no confiable. Se aísla del
// event loop HTTP y se limita su tiempo y heap, igual que la extracción textual.
export function contarPaginasPdf(contenido: Buffer): Promise<number | null> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(WORKER, {
        eval: true,
        workerData: {
          bytes: contenido,
          modulePath: require.resolve('pdf-lib'),
          maxPages: LIMITES_CARGA.maxPaginasPorArchivo,
        },
        resourceLimits: { maxOldGenerationSizeMb: 256 },
        stdout: true,
        stderr: true,
      });
    } catch {
      resolve(null);
      return;
    }
    // No propagar mensajes internos del parser ni contenido documental a logs.
    worker.stdout?.resume();
    worker.stderr?.resume();
    let terminado = false;
    const finalizar = (paginas: number | null = null) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(timer);
      const resultado =
        typeof paginas === 'number' &&
        Number.isInteger(paginas) &&
        paginas > 0 &&
        paginas <= LIMITES_CARGA.maxPaginasPorArchivo
          ? paginas
          : null;
      void worker.terminate().then(
        () => resolve(resultado),
        () => resolve(resultado),
      );
    };
    const timer = setTimeout(() => finalizar(), 10000);
    worker.once('message', finalizar);
    worker.once('error', () => finalizar());
    worker.once('exit', () => finalizar());
  });
}
