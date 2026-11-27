import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class InventariosServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const esperado = process.env.COSMOS_INVENTARIOS_SERVICE_TOKEN?.trim();
    if (!esperado || esperado.length < 32) {
      throw new ServiceUnavailableException(
        'La consulta de servicio de Inventarios no está configurada.',
      );
    }
    const recibido = context
      .switchToHttp()
      .getRequest<Request>()
      .header('authorization');
    const token = /^Bearer (\S+)$/.exec(recibido ?? '')?.[1];
    const huella = (valor: string) =>
      createHash('sha256').update(valor).digest();
    if (!token || !timingSafeEqual(huella(token), huella(esperado))) {
      throw new UnauthorizedException('Credencial de servicio inválida.');
    }
    return true;
  }
}
