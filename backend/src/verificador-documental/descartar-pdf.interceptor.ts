import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { finalize } from 'rxjs';
import type { ArchivoPdfRecibido } from './pdf-validation.service';

export function descartarPdfs(archivos: ArchivoPdfRecibido[] | undefined) {
  for (const archivo of archivos ?? []) {
    if (Buffer.isBuffer(archivo.buffer)) archivo.buffer.fill(0);
    archivo.buffer = Buffer.alloc(0);
    archivo.size = 0;
  }
}

@Injectable()
export class DescartarPdfInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<{ files?: ArchivoPdfRecibido[] }>();
    // Envuelve también a Multer: se aplica a validaciones fallidas antes de
    // entrar al controlador (por ejemplo un UUID o multipart inválido).
    return next.handle().pipe(finalize(() => descartarPdfs(request.files)));
  }
}
