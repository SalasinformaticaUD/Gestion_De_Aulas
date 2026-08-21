import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIJO = 'scrypt';
const LONGITUD_CLAVE = 64;

@Injectable()
export class PasswordHashService {
  hash(password: string): string {
    return bcrypt.hashSync(password, 12);
  }

  verify(password: string, storedHash: string): boolean {
    if (storedHash.startsWith('$2'))
      return bcrypt.compareSync(password, storedHash);
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
