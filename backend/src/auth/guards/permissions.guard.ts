import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../auth.constants';
import { RequestConUsuario } from '../request-with-user.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length || this.isPermissiveMode()) return true;

    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    const permissions = new Set(
      usuario?.permisos.map((code) => code.toUpperCase()),
    );
    if (
      required.every((permission) => permissions.has(permission.toUpperCase()))
    ) {
      return true;
    }
    throw new ForbiddenException(
      'El usuario no tiene los permisos requeridos.',
    );
  }

  private isPermissiveMode(): boolean {
    return (
      (process.env.PERMISSIONS_MODE ?? 'permissive').toLowerCase() !== 'strict'
    );
  }
}
