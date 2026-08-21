import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './auth.types';

const DEFAULT_TTL_SECONDS = 8 * 60 * 60;
const DEVELOPMENT_SECRET = 'desarrollo-local-cambiar-antes-de-produccion';

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(usuario: Omit<TokenPayload, 'iat' | 'exp'>): {
    accessToken: string;
    expiresIn: number;
  } {
    const expiresIn = this.getTtlSeconds();
    return {
      accessToken: this.jwt.sign(usuario, {
        secret: this.getSecret(),
        expiresIn,
      }),
      expiresIn,
    };
  }

  verify(token: string): TokenPayload | null {
    try {
      const payload = this.jwt.verify<Partial<TokenPayload>>(token, {
        secret: this.getSecret(),
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.nombreUsuario !== 'string' ||
        !Array.isArray(payload.roles) ||
        !Array.isArray(payload.permisos) ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }

  private getSecret(): string {
    const secret = (
      process.env.JWT_SECRET ?? process.env.AUTH_TOKEN_SECRET
    )?.trim();
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET debe configurarse en producción.');
    }
    return DEVELOPMENT_SECRET;
  }

  private getTtlSeconds(): number {
    const configured = Number(
      process.env.JWT_EXPIRES_IN ?? process.env.AUTH_TOKEN_TTL_SECONDS,
    );
    return Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_TTL_SECONDS;
  }
}
