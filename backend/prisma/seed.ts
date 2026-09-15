import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error('DATABASE_URL debe configurarse para ejecutar el seed.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
  ['ESTUDIANTES', 'Gestión de estudiantes'],
  ['DOCENTES', 'Gestión de docentes'],
] as const;

const acciones = [
  'LEER',
  'CREAR',
  'ACTUALIZAR',
  'ELIMINAR',
  'APROBAR',
  'EXPORTAR',
] as const;
const accionesPorModulo: Record<string, readonly (typeof acciones)[number][]> = {
  DASHBOARD: ['LEER'],
  AULAS: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR'],
  DISPONIBILIDAD: ['LEER'],
  PRACTICAS_LIBRES: ['LEER', 'CREAR', 'ACTUALIZAR'],
  PRESTAMOS_DOCENTES: ['LEER', 'CREAR', 'ACTUALIZAR', 'APROBAR'],
  AUDIOVISUALES: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR'],
  SOFTWARE: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR'],
  OBSERVACIONES: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR'],
  LIMPIEZA: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR'],
  TAREAS: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR'],
  MULTAS: ['LEER', 'CREAR', 'ACTUALIZAR'],
  CREDENCIALES: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR'],
  REPORTES: ['LEER'],
  ADMINISTRACION: ['LEER', 'CREAR', 'ACTUALIZAR', 'ELIMINAR'],
};
const dependencias = ['Aulas de Software', 'Electrica y Electronica', 'Fisica'];
const cargos = ['ADMINISTRADOR', 'COORDINADOR', 'DOCENTE', 'MONITOR', 'ESTUDIANTE', 'TÉCNICO', 'AUXILIAR ADMINISTRATIVO'];

async function main() {
  for (const nombre of dependencias) {
    await prisma.dependencia.upsert({
      where: { nombre },
      update: { activa: true },
      create: { nombre },
    });
  }

  for (const nombre of cargos) {
    await prisma.cargo.upsert({
      where: { nombre },
      update: { activo: true },
      create: { nombre },
    });
  }

  for (const [codigo, nombre] of modulos) {
    const modulo = await prisma.modulo.upsert({
      where: { codigo },
      update: { nombre, activo: true },
      create: { codigo, nombre },
    });
    for (const accion of [
      ...(accionesPorModulo[codigo] ?? acciones),
      ...(codigo === 'CREDENCIALES' ? ['VER_SECRETO'] : []),
    ]) {
      const codigoPermiso = `${codigo}_${accion}`;
      await prisma.permiso.upsert({
        where: { codigo: codigoPermiso },
        update: { moduloId: modulo.id, descripcion: `${accion} en ${nombre}` },
        create: {
          codigo: codigoPermiso,
          moduloId: modulo.id,
          descripcion: `${accion} en ${nombre}`,
        },
      });
    }
  }

  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error(
      'ADMIN_INITIAL_PASSWORD debe tener al menos 10 caracteres para crear el administrador inicial.',
    );
  }
  const permisos = await prisma.permiso.findMany({ select: { id: true } });
  const administrador = await prisma.rol.upsert({
    where: { nombre: 'ADMINISTRADOR' },
    update: {},
    create: {
      nombre: 'ADMINISTRADOR',
      descripcion: 'Acceso administrativo inicial.',
    },
  });
  await prisma.rolPermiso.deleteMany({ where: { rolId: administrador.id } });
  await prisma.rolPermiso.createMany({
    data: permisos.map(({ id: permisoId }) => ({
      rolId: administrador.id,
      permisoId,
    })),
    skipDuplicates: true,
  });
  const usuarioAdministrador = await prisma.usuario.upsert({
    where: { nombreUsuario: 'admin' },
    update: {
      passwordHash: bcrypt.hashSync(password, 12),
      estado: 'ACTIVA',
    },
    create: {
      nombreCompleto: 'Administrador inicial',
      nombreUsuario: 'admin',
      correo: 'admin@localhost',
      passwordHash: bcrypt.hashSync(password, 12),
      roles: { create: { rolId: administrador.id } },
    },
  });

  await sembrarDatosPrueba(usuarioAdministrador.id, password);
}

async function sembrarDatosPrueba(administradorId: string, password: string) {
  const dependencia = await prisma.dependencia.findUniqueOrThrow({ where: { nombre: 'Aulas de Software' } });
  const permisosCredenciales = await prisma.permiso.findMany({
    where: { codigo: { startsWith: 'CREDENCIALES_' } }, select: { id: true },
  });
  const analista = await prisma.rol.upsert({
    where: { nombre: 'ANALISTA DE DATOS' },
    update: { descripcion: 'Perfil de pruebas para consulta de credenciales.' },
    create: { nombre: 'ANALISTA DE DATOS', descripcion: 'Perfil de pruebas para consulta de credenciales.' },
  });
  await prisma.rolPermiso.deleteMany({ where: { rolId: analista.id } });
  await prisma.rolPermiso.createMany({ data: permisosCredenciales.map((permiso) => ({ rolId: analista.id, permisoId: permiso.id })), skipDuplicates: true });

  const monitor = await prisma.rol.upsert({
    where: { nombre: 'MONITOR' },
    update: { descripcion: 'Perfil de monitor de pruebas.' },
    create: { nombre: 'MONITOR', descripcion: 'Perfil de monitor de pruebas.' },
  });
  const permisosMonitor = await prisma.permiso.findMany({
    where: { codigo: { in: ['DASHBOARD_LEER', 'LIMPIEZA_LEER', 'LIMPIEZA_CREAR', 'DISPONIBILIDAD_LEER', 'AULAS_LEER'] } }, select: { id: true },
  });
  await prisma.rolPermiso.deleteMany({ where: { rolId: monitor.id } });
  await prisma.rolPermiso.createMany({ data: permisosMonitor.map((permiso) => ({ rolId: monitor.id, permisoId: permiso.id })), skipDuplicates: true });

  const usuarioPrueba = async (nombreUsuario: string, nombreCompleto: string, rolId: string, cargo: string) => {
    const usuario = await prisma.usuario.upsert({
      where: { nombreUsuario },
      update: { nombreCompleto, passwordHash: bcrypt.hashSync(password, 12), estado: 'ACTIVA', dependenciaId: dependencia.id, cargo },
      create: { nombreUsuario, nombreCompleto, correo: `${nombreUsuario}@pruebas.local`, passwordHash: bcrypt.hashSync(password, 12), estado: 'ACTIVA', dependenciaId: dependencia.id, cargo },
    });
    await prisma.usuarioRol.upsert({ where: { usuarioId_rolId: { usuarioId: usuario.id, rolId } }, update: {}, create: { usuarioId: usuario.id, rolId } });
    return usuario;
  };
  const analistaUsuario = await usuarioPrueba('analista', 'Ana Analista de Datos', analista.id, 'ANALISTA DE DATOS');
  const monitorUsuario = await usuarioPrueba('monitor', 'Mateo Monitor de Pruebas', monitor.id, 'MONITOR');

  const ingenieria = await prisma.proyectoCurricular.upsert({ where: { nombre: 'Ingeniería de Sistemas' }, update: {}, create: { nombre: 'Ingeniería de Sistemas' } });
  const periodo = await prisma.periodoAcademico.upsert({
    where: { nombre: '2026-3 PRUEBAS' }, update: { activo: true, fechaInicio: new Date('2026-08-01T00:00:00-05:00'), fechaFin: new Date('2026-12-20T23:59:59-05:00') },
    create: { nombre: '2026-3 PRUEBAS', activo: true, fechaInicio: new Date('2026-08-01T00:00:00-05:00'), fechaFin: new Date('2026-12-20T23:59:59-05:00') },
  });
  await prisma.periodoAcademico.updateMany({ where: { id: { not: periodo.id } }, data: { activo: false } });
  const aulasPrueba: Array<[string, string, number]> = [
    ['A-101', 'Edificio Sabio Caldas · Piso 1', 30], ['A-102', 'Edificio Sabio Caldas · Piso 1', 28], ['A-103', 'Edificio Sabio Caldas · Piso 1', 32], ['A-201', 'Edificio Sabio Caldas · Piso 2', 25], ['A-202', 'Edificio Sabio Caldas · Piso 2', 35],
  ];
  const aulas = await Promise.all(aulasPrueba.map(async ([codigo, ubicacion, capacidad]) => prisma.aula.upsert({ where: { codigo }, update: { ubicacion, capacidad, estado: 'OPERATIVA', proyectoCurricularId: ingenieria.id, eliminadoEn: null }, create: { codigo, ubicacion, capacidad, estado: 'OPERATIVA', proyectoCurricularId: ingenieria.id, caracteristicas: ['Computadores', 'Proyector'] } })));
  const [a101, a102, a103, a201, a202] = aulas;
  const docentes = await Promise.all([
    ['101010101', 'Laura Gómez', 'laura.gomez@udistrital.edu.co'], ['202020202', 'Carlos Rojas', 'carlos.rojas@udistrital.edu.co'], ['303030303', 'Diana Torres', 'diana.torres@udistrital.edu.co'],
  ].map(([documento, nombre, correo]) => prisma.docente.upsert({ where: { documento }, update: { nombre, correo, proyecto: 'Ingeniería de Sistemas' }, create: { documento, nombre, correo, proyecto: 'Ingeniería de Sistemas' } })));
  const [docente1, docente2, docente3] = docentes;
  const asignaturas = await Promise.all([
    ['SIS001', 'Programación Orientada a Objetos'], ['SIS002', 'Bases de Datos'], ['SIS003', 'Analítica de Datos'],
  ].map(([codigo, nombre]) => prisma.asignatura.upsert({ where: { codigo }, update: { nombre, proyectoCurricularId: ingenieria.id }, create: { codigo, nombre, proyectoCurricularId: ingenieria.id } })));
  const [programacion, basesDatos, analitica] = asignaturas;
  await prisma.estudiante.createMany({ data: [
    ['202610001', 'Valentina Pérez', 'valentina.perez@correo.udistrital.edu.co'], ['202610002', 'Juan Camilo Díaz', 'juan.diaz@correo.udistrital.edu.co'], ['202610003', 'Sofía Martínez', 'sofia.martinez@correo.udistrital.edu.co'], ['202610004', 'Andrés Ruiz', 'andres.ruiz@correo.udistrital.edu.co'], ['202610005', 'Mariana López', 'mariana.lopez@correo.udistrital.edu.co'],
  ].map(([codigo, nombre, correo]) => ({ codigo, nombre, correo })), skipDuplicates: true });
  const clasePrueba = async (aulaId: string, docenteId: string, asignaturaId: string, diaSemana: number, horaInicio: string, horaFin: string, grupo: string) => {
    const existente = await prisma.claseProgramada.findFirst({ where: { periodoId: periodo.id, aulaId, docenteId, asignaturaId, diaSemana, horaInicio: new Date(`1970-01-01T${horaInicio}:00.000Z`), grupo } });
    return existente ?? prisma.claseProgramada.create({ data: { periodoId: periodo.id, aulaId, docenteId, asignaturaId, proyectoCurricularId: ingenieria.id, diaSemana, horaInicio: new Date(`1970-01-01T${horaInicio}:00.000Z`), horaFin: new Date(`1970-01-01T${horaFin}:00.000Z`), grupo, inscritos: 25, modeloPc: 'Dell OptiPlex', software: 'VS Code', hardware: 'Core i5' } });
  };
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const diaSemana = new Date(`${hoy}T00:00:00.000Z`).getUTCDay();
  const horaBogota = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const inicioBloque = Math.min(20, Math.max(6, horaBogota - (horaBogota % 2)));
  const horaInicioBloque = `${String(inicioBloque).padStart(2, '0')}:00`;
  const horaFinBloque = `${String(inicioBloque + 2).padStart(2, '0')}:00`;
  const claseOcupada = await clasePrueba(a101.id, docente1.id, programacion.id, diaSemana, horaInicioBloque, horaFinBloque, '01');
  await clasePrueba(a102.id, docente2.id, basesDatos.id, diaSemana, '10:00', '12:00', '02');
  await clasePrueba(a201.id, docente3.id, analitica.id, diaSemana, '14:00', '16:00', '01');
  await prisma.asistenciaDocente.upsert({ where: { claseId_fecha: { claseId: claseOcupada.id, fecha: new Date(`${hoy}T00:00:00.000Z`) } }, update: { estado: 'ASISTIO', registradoPorId: administradorId, registradaEn: new Date(), observacion: 'Asistencia de prueba confirmada.' }, create: { claseId: claseOcupada.id, fecha: new Date(`${hoy}T00:00:00.000Z`), estado: 'ASISTIO', registradoPorId: administradorId, registradaEn: new Date(), observacion: 'Asistencia de prueba confirmada.' } });
  const softwares = await Promise.all([['Visual Studio Code', '1.103', 'Editor de código'], ['PostgreSQL', '16', 'Motor de base de datos'], ['Python', '3.12', 'Intérprete de Python']].map(([nombre, version, descripcion]) => prisma.software.upsert({ where: { nombre_version: { nombre, version } }, update: { descripcion, estado: 'ACTIVO' }, create: { nombre, version, descripcion, estado: 'ACTIVO' } })));
  for (const aula of [a101, a102, a103, a201, a202]) for (const software of softwares.slice(0, 2)) await prisma.aulaSoftware.upsert({ where: { aulaId_softwareId: { aulaId: aula.id, softwareId: software.id } }, update: {}, create: { aulaId: aula.id, softwareId: software.id } });
  await prisma.practicaLibre.create({ data: { estudianteId: (await prisma.estudiante.findUniqueOrThrow({ where: { codigo: '202610001' } })).id, aulaId: a202.id, atendidoPorId: monitorUsuario.id, softwareSolicitado: 'Python', inicio: new Date(), finEstimada: new Date(Date.now() + 2 * 60 * 60 * 1000), estado: 'ACTIVO' } }).catch(() => undefined);
}

void main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
