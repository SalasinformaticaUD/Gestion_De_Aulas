import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_MODULE_KEY } from '../auth.constants';
import { RequestConUsuario } from '../request-with-user.type';

@Injectable()
export class ModulePermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredModule) return true;

    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    const hasAccess = usuario?.modulos.some(
      (codigo) => codigo.toUpperCase() === requiredModule.toUpperCase(),
    );
    if (hasAccess || this.isPermissiveMode()) return true;
    throw new ForbiddenException(
      `El usuario no tiene acceso al módulo ${requiredModule}.`,
    );
  }

  private isPermissiveMode(): boolean {
    return (
      (process.env.PERMISSIONS_MODE ?? 'permissive').toLowerCase() !== 'strict'
    );
  }
}
