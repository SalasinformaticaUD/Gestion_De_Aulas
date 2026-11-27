import { PayloadTooLargeException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { LIMITES_CARGA } from './verificador-documental.constants';

type ArchivoEnMemoria = { stream: Readable; buffer?: Buffer; size?: number };
type CallbackArchivo = (
  error: Error | null,
  info?: { buffer: Buffer; size: number },
) => void;

// Multer no impone un límite agregado de bytes. Esta implementación limita la
// memoria durante la recepción, antes de concatenar o analizar los PDF.
export class BoundedMemoryStorage {
  private readonly bytesPorPeticion = new WeakMap<object, number>();

  _handleFile(req: object, file: ArchivoEnMemoria, callback: CallbackArchivo) {
    let chunks: Buffer[] = [];
    let size = 0;
    let terminado = false;
    const terminar = (error: Error | null) => {
      if (terminado) return;
      terminado = true;
      if (error) {
        chunks = [];
        callback(error);
      } else {
        const buffer = Buffer.concat(chunks, size);
        chunks = [];
        callback(null, { buffer, size });
      }
    };
    file.stream.on('data', (chunk: Buffer) => {
      if (terminado) return;
      const total = (this.bytesPorPeticion.get(req) ?? 0) + chunk.length;
      this.bytesPorPeticion.set(req, total);
      if (total > LIMITES_CARGA.maxTotalBytes) {
        terminar(
          new PayloadTooLargeException(
            'El envío supera el límite total de 60 MB.',
          ),
        );
        return;
      }
      size += chunk.length;
      if (size > LIMITES_CARGA.maxArchivoBytes) {
        terminar(
          new PayloadTooLargeException('El archivo supera el límite de 20 MB.'),
        );
        return;
      }
      chunks.push(chunk);
    });
    file.stream.once('error', () => {
      // Multer registra primero su propio manejador, descuenta la escritura y
      // aborta la petición. No invocar el callback otra vez desde este evento.
      terminado = true;
      chunks = [];
    });
    file.stream.once('limit', () =>
      terminar(
        new PayloadTooLargeException('El archivo supera el límite de 20 MB.'),
      ),
    );
    file.stream.once('end', () => terminar(null));
    file.stream.once('close', () => {
      if (!terminado)
        terminar(
          new Error('La carga se interrumpió antes de terminar el archivo.'),
        );
    });
  }

  _removeFile(
    _req: object,
    file: ArchivoEnMemoria,
    callback: (error: Error | null) => void,
  ) {
    file.buffer?.fill(0);
    delete file.buffer;
    callback(null);
  }
}
