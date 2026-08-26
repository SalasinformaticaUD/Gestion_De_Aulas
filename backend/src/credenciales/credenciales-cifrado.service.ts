import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

@Injectable()
export class CredencialesCifradoService {
  private key(): Buffer {
    const value = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
    if (!value)
      throw new InternalServerErrorException(
        'CREDENTIALS_ENCRYPTION_KEY no está configurada.',
      );
    return createHash('sha256').update(value).digest();
  }
  cifrar(secreto: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const content = Buffer.concat([
      cipher.update(secreto, 'utf8'),
      cipher.final(),
    ]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${content.toString('base64')}`;
  }
  descifrar(valor: string): string {
    const [version, iv, tag, content] = valor.split(':');
    if (version !== 'v1' || !iv || !tag || !content)
      throw new InternalServerErrorException(
        'El secreto cifrado no tiene un formato válido.',
      );
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(content, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'No fue posible descifrar la credencial.',
      );
    }
  }
}
