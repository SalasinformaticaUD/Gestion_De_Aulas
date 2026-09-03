import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ADMINISTRATOR_KEY } from '../auth.constants';
import { RequestConUsuario } from '../request-with-user.type';

@Injectable()
export class AdministratorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ADMINISTRATOR_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    const isAdministrator = usuario?.roles.some(
      (rol) => rol.trim().toUpperCase() === 'ADMINISTRADOR',
    );
    if (isAdministrator) return true;

    throw new ForbiddenException(
      'Acceso exclusivo para el usuario administrador.',
    );
  }
}
