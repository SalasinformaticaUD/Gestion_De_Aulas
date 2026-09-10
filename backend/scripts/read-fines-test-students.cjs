const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const env = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env')));
const client = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
(async () => {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const students = await client.query('SELECT codigo, nombre FROM "Estudiante" ORDER BY codigo LIMIT 20');
  const reasons = await client.query('SELECT nombre FROM "MotivoMulta" ORDER BY nombre LIMIT 1');
  await client.query('ROLLBACK');
  const output = path.join(__dirname, '../../.tmp-fines-template-edit/students-test.json');
  fs.writeFileSync(output, JSON.stringify({ students: students.rows, reason: reasons.rows[0]?.nombre }));
  console.log(JSON.stringify({ estudiantesVerificados: students.rowCount, motivoExistente: !!reasons.rowCount }));
})().catch(() => { console.error('No fue posible consultar la base local para preparar el archivo.'); process.exitCode = 1; }).finally(() => client.end());
