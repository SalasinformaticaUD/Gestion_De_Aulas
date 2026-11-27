import { FilesInterceptor } from '@nestjs/platform-express';
import { LIMITES_CARGA } from './verificador-documental.constants';
import { validarMetadatosPdf } from './pdf-validation.service';
import { BoundedMemoryStorage } from './bounded-memory.storage';

export const CargaPdfInterceptor = FilesInterceptor(
  'archivos',
  LIMITES_CARGA.maxArchivos,
  {
    storage: new BoundedMemoryStorage(),
    limits: {
      fileSize: LIMITES_CARGA.maxArchivoBytes,
      files: LIMITES_CARGA.maxArchivos,
      fields: 0,
      parts: LIMITES_CARGA.maxArchivos + 1,
    },
    fileFilter: (_req, file, callback) => {
      try {
        // Multer recibe el nombre multipart en Latin-1. Recupera UTF-8 cuando
        // es válido y conserva los nombres que ya estaban bien codificados.
        if (
          Array.from(file.originalname).every((c) => c.charCodeAt(0) <= 255)
        ) {
          try {
            file.originalname = new TextDecoder('utf-8', {
              fatal: true,
            }).decode(Buffer.from(file.originalname, 'latin1'));
          } catch {
            /* Ya era un nombre Unicode. */
          }
        }
        validarMetadatosPdf(file.originalname, file.mimetype);
        callback(null, true);
      } catch (error) {
        callback(
          error instanceof Error ? error : new Error('Archivo inválido'),
          false,
        );
      }
    },
  },
);
