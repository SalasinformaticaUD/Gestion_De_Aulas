import 'dotenv/config';

function requiredInProduction(name: string): void {
  if (process.env.NODE_ENV === 'production' && !process.env[name]?.trim()) {
    throw new Error(`${name} debe configurarse en produccion.`);
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
    port();
  },
};
