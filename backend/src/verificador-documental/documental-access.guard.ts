import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { REQUIRED_PERMISSIONS_KEY } from '../auth/auth.constants';
import type { RequestConUsuario } from '../auth/request-with-user.type';

@Injectable()
export class DocumentalAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Los datos documentales no deben quedar en cachés de navegador o proxy.
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const permisos = new Set(usuario?.permisos.map((p) => p.toUpperCase()));
    if (
      !usuario?.modulos.some(
        (m) => m.toUpperCase() === 'VERIFICADOR_DOCUMENTAL',
      ) ||
      !required.length ||
      !required.every((p) => permisos.has(p.toUpperCase()))
    )
      throw new ForbiddenException(
        'El usuario no tiene acceso o los permisos requeridos para el verificador documental.',
      );
    // Esta comprobación siempre es estricta, incluso si otro módulo usa el
    // modo permisivo de desarrollo. No altera los guardias de otros módulos.
    return true;
  }
}
