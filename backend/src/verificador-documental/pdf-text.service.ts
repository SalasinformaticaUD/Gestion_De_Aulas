import { Injectable } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

export type PaginaTexto = { pagina: number; texto: string; error?: boolean };
const WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const { getDocument } = await import(workerData.moduleUrl);
  const task = getDocument({ data: new Uint8Array(workerData.bytes), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, verbosity: 0 });
  const pdf = await task.promise;
  try {
    const pages = []; let length = 0;
    for (let n=1;n<=pdf.numPages;n++) {
      try {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        const text = content.items.map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\\n' : ' ') : '').join('');
        length += text.length;
        if (text.length > 200000 || length > 2000000) throw new Error('TEXT_LIMIT');
        pages.push({ pagina:n, texto:text }); page.cleanup();
      } catch { pages.push({ pagina:n, texto:'', error:true }); }
    }
    parentPort.postMessage(pages);
  } finally { await pdf.destroy(); }
})().catch(() => parentPort.postMessage(null));
`;

@Injectable()
export class PdfTextService {
  extraer(contenido: Buffer, numeroPaginas: number): Promise<PaginaTexto[]> {
    const fallback = () =>
      Array.from({ length: numeroPaginas }, (_, i) => ({
        pagina: i + 1,
        texto: '',
        error: true,
      }));
    return new Promise((resolve) => {
      let worker: Worker;
      try {
        worker = new Worker(WORKER, {
          eval: true,
          workerData: {
            bytes: contenido,
            moduleUrl: pathToFileURL(
              require.resolve('pdfjs-dist/legacy/build/pdf.mjs'),
            ).href,
          },
          resourceLimits: { maxOldGenerationSizeMb: 256 },
          stdout: true,
          stderr: true,
        });
        worker.stdout?.resume();
        worker.stderr?.resume();
      } catch {
        resolve(fallback());
        return;
      }
      let done = false;
      const finish = (pages?: PaginaTexto[]) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const resultado = pages?.length === numeroPaginas ? pages : fallback();
        void worker.terminate().then(
          () => resolve(resultado),
          () => resolve(resultado),
        );
      };
      const timer = setTimeout(() => finish(), 20000);
      worker.once('message', (pages: PaginaTexto[] | null) =>
        finish(pages ?? undefined),
      );
      worker.once('error', () => finish());
      worker.once('exit', () => finish());
    });
  }
}
