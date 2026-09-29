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
export class FormsIntegrationKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.FORMS_INTEGRATION_KEY?.trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'La integración con Microsoft Forms no está configurada.',
      );
    }
    const supplied = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-integration-key')
      ?.trim();
    if (!supplied || !this.sameKey(expected, supplied)) {
      throw new UnauthorizedException('Credencial de integración inválida.');
    }
    return true;
  }

  private sameKey(expected: string, supplied: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    return (
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer)
    );
  }
}
