import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { contarPaginasPdf } from './pdf-structure';
import { LIMITES_CARGA } from './verificador-documental.constants';

export type ArchivoPdfRecibido = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};
export type ArchivoPdfValidado = {
  nombreOriginal: string;
  tamanoBytes: number;
  sha256: string;
  numeroPaginas: number;
  contenido: Buffer;
};

export function validarMetadatosPdf(nombre: string, mimetype: string) {
  if (
    !/\.pdf$/i.test(nombre) ||
    Array.from(nombre).some((c) => c.charCodeAt(0) < 32) ||
    nombre.length > 255
  )
    throw new BadRequestException(
      'Cada archivo debe tener un nombre válido con extensión .pdf (máximo 255 caracteres).',
    );
  // Algunos sistemas no informan MIME o envían el binario genérico. La firma
  // y el parser de PDF son siempre obligatorios, independientemente del MIME.
  if (
    !['application/pdf', 'application/octet-stream', ''].includes(
      mimetype.toLowerCase(),
    )
  )
    throw new BadRequestException(
      `${nombre}: el tipo de archivo declarado no corresponde a PDF.`,
    );
}

@Injectable()
export class PdfValidationService {
  async validar(
    archivos: ArchivoPdfRecibido[] | undefined,
    modalidad: string,
  ): Promise<ArchivoPdfValidado[]> {
    if (!archivos?.length)
      throw new BadRequestException('Seleccione al menos un archivo PDF.');
    if (archivos.length > LIMITES_CARGA.maxArchivos)
      throw new BadRequestException(
        `Puede cargar hasta ${LIMITES_CARGA.maxArchivos} PDF.`,
      );
    if (modalidad === 'PDF_UNIFICADO' && archivos.length !== 1)
      throw new BadRequestException(
        'La modalidad PDF unificado requiere exactamente un archivo.',
      );
    const total = archivos.reduce(
      (sum, archivo) => sum + archivo.buffer.length,
      0,
    );
    if (total > LIMITES_CARGA.maxTotalBytes)
      throw new PayloadTooLargeException(
        'El envío supera el límite total de 60 MB.',
      );
    const hashes = new Set<string>();
    const resultado: ArchivoPdfValidado[] = [];
    for (const archivo of archivos) {
      validarMetadatosPdf(archivo.originalname, archivo.mimetype);
      const size = archivo.buffer.length;
      if (!size)
        throw new BadRequestException(
          `${archivo.originalname}: el archivo está vacío.`,
        );
      if (size > LIMITES_CARGA.maxArchivoBytes)
        throw new PayloadTooLargeException(
          `${archivo.originalname}: supera el límite de 20 MB.`,
        );
      const header = archivo.buffer.subarray(0, 1024).toString('latin1');
      const tail = archivo.buffer.subarray(-1024).toString('latin1');
      if (
        !/^%PDF-\d\.\d/.test(header) ||
        !/%%EOF\s*$/.test(tail.replaceAll(String.fromCharCode(0), ''))
      )
        throw new BadRequestException(
          `${archivo.originalname}: el contenido no corresponde a un PDF completo.`,
        );
      const numeroPaginas = await contarPaginasPdf(archivo.buffer);
      if (numeroPaginas === null) {
        throw new BadRequestException(
          `${archivo.originalname}: PDF dañado, protegido, demasiado complejo o con más de ${LIMITES_CARGA.maxPaginasPorArchivo} páginas. Cargue un PDF legible y sin contraseña.`,
        );
      }
      const sha256 = createHash('sha256').update(archivo.buffer).digest('hex');
      if (hashes.has(sha256))
        throw new BadRequestException(
          `${archivo.originalname}: el mismo PDF está seleccionado más de una vez.`,
        );
      hashes.add(sha256);
      resultado.push({
        nombreOriginal: archivo.originalname,
        tamanoBytes: size,
        sha256,
        numeroPaginas,
        contenido: archivo.buffer,
      });
    }
    return resultado;
  }
}
