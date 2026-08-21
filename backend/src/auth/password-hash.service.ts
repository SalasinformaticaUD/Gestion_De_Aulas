import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIJO = 'scrypt';
const LONGITUD_CLAVE = 64;

@Injectable()
export class PasswordHashService {
  hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, LONGITUD_CLAVE);
    return `${PREFIJO}$${salt}$${derivedKey.toString('hex')}`;
  }

  verify(password: string, storedHash: string): boolean {
    const [prefix, salt, encodedHash, extra] = storedHash.split('$');
    if (prefix !== PREFIJO || !salt || !encodedHash || extra !== undefined) {
      return false;
    }

    try {
      const expected = Buffer.from(encodedHash, 'hex');
      if (expected.length !== LONGITUD_CLAVE) return false;
      const actual = scryptSync(password, salt, expected.length);
      return timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
}
