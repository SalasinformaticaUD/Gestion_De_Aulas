import { PasswordHashService } from './password-hash.service';

describe('PasswordHashService', () => {
  const service = new PasswordHashService();

  it('genera un hash scrypt y valida la contraseña sin almacenar texto plano', () => {
    const hash = service.hash('Clave-segura-2026');

    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain('Clave-segura-2026');
    expect(service.verify('Clave-segura-2026', hash)).toBe(true);
    expect(service.verify('Clave-incorrecta', hash)).toBe(false);
  });

  it('rechaza hashes con formato desconocido', () => {
    expect(service.verify('cualquier-clave', 'texto-plano')).toBe(false);
  });
});
