import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULOS_CON_LECTURA_AUXILIAR, REQUIRED_PERMISSIONS_KEY } from '../auth.constants';
import { RequestConUsuario } from '../request-with-user.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      !required?.length ||
      (this.isPermissiveMode() &&
        !required.some((permission) =>
          /^(ESTUDIANTES|DOCENTES)_(LEER|CREAR|ACTUALIZAR|ELIMINAR)$/i.test(
            permission,
          ),
        ))
    )
      return true;

    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    const permissions = new Set(
      usuario?.permisos.map((code) => code.toUpperCase()),
    );
    const hasPermission = (permission: string) => {
      const normalized = permission.toUpperCase();
      if (permissions.has(normalized)) return true;
      const separator = normalized.lastIndexOf('_');
      if (separator <= 0 || normalized.slice(separator + 1) !== 'LEER') return false;
      const module = normalized.slice(0, separator);
      return (MODULOS_CON_LECTURA_AUXILIAR[module] ?? []).some((dependentModule) =>
        usuario?.modulos.some((code) => code.toUpperCase() === dependentModule),
      );
    };
    if (required.every(hasPermission)) {
      return true;
    }
    throw new ForbiddenException(
      'El usuario no tiene los permisos requeridos.',
    );
  }

  private isPermissiveMode(): boolean {
    return (
      (process.env.PERMISSIONS_MODE ?? 'strict').toLowerCase() === 'permissive'
    );
  }
}
