import 'dotenv/config';

function requiredInProduction(name: string): void {
  if (process.env.NODE_ENV === 'production' && !process.env[name]?.trim()) {
    throw new Error(`${name} debe configurarse en produccion.`);
  }
}

function secureSecretInProduction(name: string): void {
  if (process.env.NODE_ENV !== 'production') return;
  const value = process.env[name]?.trim() ?? '';
  if (value.length < 32 || value.toUpperCase().includes('CHANGE_ME')) {
    throw new Error(
      `${name} debe ser un secreto aleatorio de al menos 32 caracteres en produccion.`,
    );
  }
}

function port(): number {
  const value = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('PORT debe ser un puerto valido.');
  }
  return value;
}

export const environment = {
  get port(): number {
    return port();
  },
  validate(): void {
    requiredInProduction('DATABASE_URL');
    requiredInProduction('JWT_SECRET');
    requiredInProduction('FRONTEND_URL');
    requiredInProduction('MONITORES_SERVICE_TOKEN');
    requiredInProduction('CREDENTIALS_ENCRYPTION_KEY');
    secureSecretInProduction('JWT_SECRET');
    secureSecretInProduction('MONITORES_SERVICE_TOKEN');
    secureSecretInProduction('CREDENTIALS_ENCRYPTION_KEY');
    port();
  },
};
