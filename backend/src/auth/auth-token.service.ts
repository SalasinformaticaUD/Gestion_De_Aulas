import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { TokenPayload } from './auth.types';

const HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const DEFAULT_TTL_SECONDS = 8 * 60 * 60;
const DEVELOPMENT_SECRET = 'desarrollo-local-cambiar-antes-de-produccion';

@Injectable()
export class AuthTokenService {
  sign(usuarioId: string): { accessToken: string; expiresIn: number } {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.getTtlSeconds();
    const payload: TokenPayload = {
      sub: usuarioId,
      iat: now,
      exp: now + expiresIn,
    };
    const encodedHeader = this.encode(HEADER);
    const encodedPayload = this.encode(payload);
    const content = `${encodedHeader}.${encodedPayload}`;
    return {
      accessToken: `${content}.${this.signature(content)}`,
      expiresIn,
    };
  }

  verify(token: string): TokenPayload | null {
    const [encodedHeader, encodedPayload, providedSignature, extra] =
      token.split('.');
    if (
      !encodedHeader ||
      !encodedPayload ||
      !providedSignature ||
      extra !== undefined
    ) {
      return null;
    }

    const content = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.signature(content);
    const expected = Buffer.from(expectedSignature);
    const provided = Buffer.from(providedSignature);
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      return null;
    }

    try {
      const header = JSON.parse(this.decode(encodedHeader)) as {
        alg?: unknown;
        typ?: unknown;
      };
      const payload = JSON.parse(
        this.decode(encodedPayload),
      ) as Partial<TokenPayload>;
      const now = Math.floor(Date.now() / 1000);
      if (
        header.alg !== HEADER.alg ||
        header.typ !== HEADER.typ ||
        typeof payload.sub !== 'string' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number' ||
        payload.exp <= now
      ) {
        return null;
      }
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }

  private signature(content: string): string {
    return createHmac('sha256', this.getSecret())
      .update(content)
      .digest('base64url');
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private getSecret(): string {
    const secret = process.env.AUTH_TOKEN_SECRET?.trim();
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_TOKEN_SECRET debe configurarse en producción.');
    }
    return DEVELOPMENT_SECRET;
  }

  private getTtlSeconds(): number {
    const configured = Number(process.env.AUTH_TOKEN_TTL_SECONDS);
    return Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_TTL_SECONDS;
  }
}
