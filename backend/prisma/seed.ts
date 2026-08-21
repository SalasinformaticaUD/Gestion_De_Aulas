import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL debe configurarse para ejecutar el seed.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const modulos = [
  ['DASHBOARD', 'Dashboard'],
  ['HORARIOS', 'Horarios'],
  ['AULAS', 'Aulas'],
  ['DISPONIBILIDAD', 'Disponibilidad'],
  ['PRACTICAS_LIBRES', 'Prácticas libres'],
  ['PRESTAMOS_DOCENTES', 'Préstamos docentes'],
  ['AUDIOVISUALES', 'Audiovisuales'],
  ['SOFTWARE', 'Software'],
  ['OBSERVACIONES', 'Observaciones'],
  ['LIMPIEZA', 'Limpieza'],
  ['TAREAS', 'Tareas'],
  ['MULTAS', 'Multas'],
  ['CREDENCIALES', 'Credenciales'],
  ['REPORTES', 'Reportes'],
  ['ADMINISTRACION', 'Administración'],
  ['MONITORES', 'Gestión de Monitores'],
] as const;

const acciones = ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR', 'EXPORTAR'] as const;
const dependencias = ['Aulas de Software', 'Electrica y Electronica', 'Fisica'];

async function main() {
  for (const nombre of dependencias) {
    await prisma.dependencia.upsert({
      where: { nombre },
      update: { activa: true },
      create: { nombre },
    });
  }

  for (const [codigo, nombre] of modulos) {
    const modulo = await prisma.modulo.upsert({
      where: { codigo },
      update: { nombre, activo: true },
      create: { codigo, nombre },
    });
    for (const accion of acciones) {
      const codigoPermiso = `${codigo}_${accion}`;
      await prisma.permiso.upsert({
        where: { codigo: codigoPermiso },
        update: { moduloId: modulo.id, descripcion: `${accion} en ${nombre}` },
        create: { codigo: codigoPermiso, moduloId: modulo.id, descripcion: `${accion} en ${nombre}` },
      });
    }
  }

  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('ADMIN_INITIAL_PASSWORD debe tener al menos 10 caracteres para crear el administrador inicial.');
  }
  const permisos = await prisma.permiso.findMany({ select: { id: true } });
  const administrador = await prisma.rol.upsert({
    where: { nombre: 'ADMINISTRADOR' },
    update: {},
    create: { nombre: 'ADMINISTRADOR', descripcion: 'Acceso administrativo inicial.' },
  });
  await prisma.rolPermiso.deleteMany({ where: { rolId: administrador.id } });
  await prisma.rolPermiso.createMany({
    data: permisos.map(({ id: permisoId }) => ({ rolId: administrador.id, permisoId })),
    skipDuplicates: true,
  });
  await prisma.usuario.upsert({
    where: { nombreUsuario: 'admin' },
    update: {},
    create: {
      nombreCompleto: 'Administrador inicial',
      nombreUsuario: 'admin',
      correo: 'admin@localhost',
      passwordHash: bcrypt.hashSync(password, 12),
      roles: { create: { rolId: administrador.id } },
    },
  });
}

void main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
