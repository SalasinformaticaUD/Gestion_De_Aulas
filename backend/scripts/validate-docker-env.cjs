const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const argumentIndex = process.argv.indexOf('--env-file');
const envFile = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : '.env.docker';
const resolvedFile = path.resolve(process.cwd(), envFile);

if (!envFile || !fs.existsSync(resolvedFile)) {
  console.error(`No se encontró el archivo de entorno: ${resolvedFile}`);
  process.exit(1);
}

const values = dotenv.parse(fs.readFileSync(resolvedFile));
const required = [
  'POSTGRES_PASSWORD',
  'JWT_SECRET',
  'MONITORES_SERVICE_TOKEN',
  'CREDENTIALS_ENCRYPTION_KEY',
  'FRONTEND_PUBLIC_URL',
  'MONITORES_API_URL',
];
const secureSecrets = [
  'JWT_SECRET',
  'MONITORES_SERVICE_TOKEN',
  'CREDENTIALS_ENCRYPTION_KEY',
];
const errors = [];

for (const name of required) {
  const value = values[name]?.trim();
  if (!value || value.toUpperCase().includes('CHANGE_ME')) {
    errors.push(`${name} debe configurarse con un valor real.`);
  }
}

for (const name of secureSecrets) {
  const value = values[name]?.trim() ?? '';
  if (value && value.length < 32) {
    errors.push(`${name} debe tener al menos 32 caracteres.`);
  }
}

if (values.RUN_DATABASE_SEED === 'true') {
  const password = values.ADMIN_INITIAL_PASSWORD?.trim() ?? '';
  if (!password || password.toUpperCase().includes('CHANGE_ME') || password.length < 12) {
    errors.push('ADMIN_INITIAL_PASSWORD debe tener al menos 12 caracteres cuando RUN_DATABASE_SEED=true.');
  }
}

for (const name of ['FRONTEND_PUBLIC_URL', 'MONITORES_API_URL']) {
  const value = values[name]?.trim();
  if (!value || value.toUpperCase().includes('CHANGE_ME')) continue;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocolo inválido');
  } catch {
    errors.push(`${name} debe ser una URL HTTP(S) válida.`);
  }
}

if (errors.length) {
  console.error('La configuración de despliegue no pasó la validación:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Configuración de despliegue válida: ${resolvedFile}`);
