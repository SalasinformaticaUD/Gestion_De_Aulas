import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenService } from '../auth-token.service';
import {
  IS_PUBLIC_KEY,
  REQUIRED_MODULE_KEY,
  REQUIRE_AUTH_KEY,
} from '../auth.constants';
import { AuthService } from '../auth.service';
import { RequestConUsuario } from '../request-with-user.type';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AuthTokenService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const token = this.getBearerToken(request.headers.authorization);
    const requiredModule = this.reflector.getAllAndOverride<string>(
      REQUIRED_MODULE_KEY,
      targets,
    );
    const explicitlyRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_AUTH_KEY,
      targets,
    );
    const authRequired =
      explicitlyRequired ??
      (this.isStrictMode() ||
        (Boolean(requiredModule) && this.arePermissionsStrict()));

    if (!token) {
      if (authRequired)
        throw new UnauthorizedException('Autenticación requerida.');
      return true;
    }

    const payload = this.tokens.verify(token);
    if (!payload) throw new UnauthorizedException('Token inválido o vencido.');
    const usuario = await this.authService.findAuthenticatedUser(payload.sub);
    if (!usuario)
      throw new UnauthorizedException('Usuario inactivo o inexistente.');
    request.user = usuario;
    return true;
  }

  private getBearerToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, token, extra] = header.trim().split(/\s+/);
    return scheme?.toLowerCase() === 'bearer' && token && !extra ? token : null;
  }

  private isStrictMode(): boolean {
    const configured = process.env.AUTH_REQUIRED?.toLowerCase();
    if (configured === 'true') return true;
    if (configured === 'false') return false;
    return process.env.NODE_ENV === 'production';
  }

  private arePermissionsStrict(): boolean {
    return process.env.PERMISSIONS_MODE?.toLowerCase() === 'strict';
  }
}
