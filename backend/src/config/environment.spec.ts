import { environment } from './environment';

describe('environment', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...original,
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:password@db:5432/aulas',
      FRONTEND_URL: 'https://aulas.example.edu',
      JWT_SECRET: 'jwt-secret-aleatorio-con-mas-de-32-caracteres',
      MONITORES_SERVICE_TOKEN:
        'service-token-aleatorio-con-mas-de-32-caracteres',
      FORMS_INTEGRATION_KEY: 'forms-key-aleatoria-con-mas-de-32-caracteres',
      CREDENTIALS_ENCRYPTION_KEY:
        'encryption-key-aleatoria-con-mas-de-32-caracteres',
      SOFTRACKER_DATABASE_URL:
        'postgresql://softracker_readonly:clave@softracker-db:5432/softracker',
    };
  });

  afterAll(() => {
    process.env = original;
  });

  it('acepta una configuración de producción completa', () => {
    expect(() => environment.validate()).not.toThrow();
  });

  it('rechaza secretos de plantilla aunque tengan longitud suficiente', () => {
    process.env.JWT_SECRET = 'CHANGE_ME_random_jwt_secret_at_least_32_chars';
    expect(() => environment.validate()).toThrow(
      'JWT_SECRET debe ser un secreto aleatorio',
    );
  });

  it('rechaza secretos demasiado cortos', () => {
    process.env.MONITORES_SERVICE_TOKEN = 'secreto-corto';
    expect(() => environment.validate()).toThrow(
      'MONITORES_SERVICE_TOKEN debe ser un secreto aleatorio',
    );
  });

  it('acepta SOFTRACKER_DATABASE_URL con un valor PostgreSQL válido en producción', () => {
    expect(() => environment.validate()).not.toThrow();
  });

  it('rechaza SOFTRACKER_DATABASE_URL ausente en producción', () => {
    delete process.env.SOFTRACKER_DATABASE_URL;
    expect(() => environment.validate()).toThrow('SOFTRACKER_DATABASE_URL');
  });

  it('rechaza SOFTRACKER_DATABASE_URL vacía en producción', () => {
    process.env.SOFTRACKER_DATABASE_URL = '';
    expect(() => environment.validate()).toThrow('SOFTRACKER_DATABASE_URL');
  });

  it('rechaza SOFTRACKER_DATABASE_URL compuesta solo por espacios en producción', () => {
    process.env.SOFTRACKER_DATABASE_URL = '   ';
    expect(() => environment.validate()).toThrow('SOFTRACKER_DATABASE_URL');
  });

  it('no exige SOFTRACKER_DATABASE_URL cuando NODE_ENV no es producción', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SOFTRACKER_DATABASE_URL;
    expect(() => environment.validate()).not.toThrow();
  });
});
