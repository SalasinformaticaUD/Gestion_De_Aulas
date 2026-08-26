import { InternalServerErrorException } from '@nestjs/common';
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { CredencialesCifradoService } from './credenciales-cifrado.service';

describe('CredencialesCifradoService', () => {
  const previo = process.env.CREDENTIALS_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY =
      'clave-de-prueba-de-credenciales-con-entropia-suficiente';
  });
  afterAll(() => {
    if (previo === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = previo;
  });
  it('cifra secretos sin conservar texto plano y permite recuperarlos', () => {
    const service = new CredencialesCifradoService();
    const cifrado = service.cifrar('Secreto-123!');
    expect(cifrado).not.toContain('Secreto-123!');
    expect(service.descifrar(cifrado)).toBe('Secreto-123!');
  });
  it('rechaza valores cifrados alterados', () => {
    const service = new CredencialesCifradoService();
    expect(() => service.descifrar('v1:invalido:invalido:invalido')).toThrow(
      InternalServerErrorException,
    );
  });
});
