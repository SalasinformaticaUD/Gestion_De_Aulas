import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class MonitoresServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.MONITORES_SERVICE_TOKEN?.trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'La integración de Monitores no está configurada.',
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const supplied = request.header('x-monitores-service-token')?.trim();
    if (!supplied || !this.sameToken(expected, supplied)) {
      throw new UnauthorizedException('Credencial de servicio inválida.');
    }
    return true;
  }

  private sameToken(expected: string, supplied: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    return (
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer)
    );
  }
}
