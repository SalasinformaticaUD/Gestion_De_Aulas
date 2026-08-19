-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('ACTIVA', 'INACTIVA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "EstadoAula" AS ENUM ('OPERATIVA', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PENDIENTE', 'ASISTIO', 'AUSENTE');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('SOLICITADO', 'APROBADO', 'ACTIVO', 'DEVUELTO', 'CANCELADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('DISPONIBLE', 'PRESTADO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoMulta" AS ENUM ('ACTIVA', 'CUMPLIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoCredencial" AS ENUM ('ACTIVA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "TipoObservacion" AS ENUM ('GENERAL', 'SEMANAL', 'NOVEDAD', 'RESTRICCION');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "cargo" TEXT,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'ACTIVA',
    "dependenciaId" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependencia" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Dependencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "moduloId" UUID NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "usuarioId" UUID NOT NULL,
    "rolId" UUID NOT NULL,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("usuarioId","rolId")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" UUID NOT NULL,
    "permisoId" UUID NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "datosPrevios" JSONB,
    "datosNuevos" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "caracteristicas" JSONB,
    "estado" "EstadoAula" NOT NULL DEFAULT 'OPERATIVA',
    "proyectoCurricularId" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoAcademico" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PeriodoAcademico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoCurricular" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ProyectoCurricular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "proyectoCurricularId" UUID,

    CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Docente" (
    "id" UUID NOT NULL,
    "documento" TEXT,
    "nombre" TEXT NOT NULL,
    "correo" TEXT,

    CONSTRAINT "Docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaseProgramada" (
    "id" UUID NOT NULL,
    "periodoId" UUID NOT NULL,
    "aulaId" UUID NOT NULL,
    "docenteId" UUID NOT NULL,
    "asignaturaId" UUID NOT NULL,
    "proyectoCurricularId" UUID,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TIME(0) NOT NULL,
    "horaFin" TIME(0) NOT NULL,
    "grupo" TEXT NOT NULL,
    "inscritos" INTEGER,

    CONSTRAINT "ClaseProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaDocente" (
    "id" UUID NOT NULL,
    "claseId" UUID NOT NULL,
    "registradoPorId" UUID,
    "estado" "EstadoAsistencia" NOT NULL DEFAULT 'PENDIENTE',
    "registradaEn" TIMESTAMP(3),
    "observacion" TEXT,

    CONSTRAINT "AsistenciaDocente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Software" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" TEXT,
    "descripcion" TEXT,

    CONSTRAINT "Software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AulaSoftware" (
    "aulaId" UUID NOT NULL,
    "softwareId" UUID NOT NULL,
    "instaladoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AulaSoftware_pkey" PRIMARY KEY ("aulaId","softwareId")
);

-- CreateTable
CREATE TABLE "Estudiante" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT,

    CONSTRAINT "Estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticaLibre" (
    "id" UUID NOT NULL,
    "estudianteId" UUID NOT NULL,
    "aulaId" UUID NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "finEstimada" TIMESTAMP(3),
    "finReal" TIMESTAMP(3),
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "PracticaLibre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestamoDocente" (
    "id" UUID NOT NULL,
    "docenteId" UUID NOT NULL,
    "aulaId" UUID NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'SOLICITADO',
    "motivo" TEXT,

    CONSTRAINT "PrestamoDocente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipoAudiovisual" (
    "id" UUID NOT NULL,
    "codigoInventario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'DISPONIBLE',
    "observacion" TEXT,

    CONSTRAINT "EquipoAudiovisual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestamoAudiovisual" (
    "id" UUID NOT NULL,
    "docenteId" UUID NOT NULL,
    "aulaId" UUID,
    "salidaEn" TIMESTAMP(3) NOT NULL,
    "devolucionEstimada" TIMESTAMP(3) NOT NULL,
    "devolucionReal" TIMESTAMP(3),
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "PrestamoAudiovisual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePrestamoAudiovisual" (
    "prestamoId" UUID NOT NULL,
    "equipoId" UUID NOT NULL,
    "estadoSalida" TEXT,
    "estadoDevolucion" TEXT,

    CONSTRAINT "DetallePrestamoAudiovisual_pkey" PRIMARY KEY ("prestamoId","equipoId")
);

-- CreateTable
CREATE TABLE "MotivoMulta" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "MotivoMulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Multa" (
    "id" UUID NOT NULL,
    "estudianteId" UUID NOT NULL,
    "motivoId" UUID NOT NULL,
    "estado" "EstadoMulta" NOT NULL DEFAULT 'ACTIVA',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,

    CONSTRAINT "Multa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observacion" (
    "id" UUID NOT NULL,
    "aulaId" UUID NOT NULL,
    "tipo" "TipoObservacion" NOT NULL DEFAULT 'GENERAL',
    "contenido" TEXT NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" UUID NOT NULL,
    "aulaId" UUID,
    "responsableId" UUID,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "afectaDisponibilidad" BOOLEAN NOT NULL DEFAULT false,
    "inicio" TIMESTAMP(3),
    "fin" TIMESTAMP(3),

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Limpieza" (
    "id" UUID NOT NULL,
    "aulaId" UUID NOT NULL,
    "realizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,

    CONSTRAINT "Limpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredencialOperativa" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "usuario" TEXT,
    "secretoCifrado" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoCredencial" NOT NULL DEFAULT 'ACTIVA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredencialOperativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesoCredencial" (
    "credencialId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "puedeVer" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccesoCredencial_pkey" PRIMARY KEY ("credencialId","usuarioId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nombreUsuario_key" ON "Usuario"("nombreUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Dependencia_nombre_key" ON "Dependencia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_codigo_key" ON "Permiso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_codigo_key" ON "Modulo"("codigo");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Aula_codigo_key" ON "Aula"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoAcademico_nombre_key" ON "PeriodoAcademico"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoCurricular_nombre_key" ON "ProyectoCurricular"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Asignatura_codigo_key" ON "Asignatura"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Docente_documento_key" ON "Docente"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Docente_correo_key" ON "Docente"("correo");

-- CreateIndex
CREATE INDEX "ClaseProgramada_periodoId_aulaId_diaSemana_idx" ON "ClaseProgramada"("periodoId", "aulaId", "diaSemana");

-- CreateIndex
CREATE INDEX "AsistenciaDocente_claseId_idx" ON "AsistenciaDocente"("claseId");

-- CreateIndex
CREATE UNIQUE INDEX "Software_nombre_version_key" ON "Software"("nombre", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_codigo_key" ON "Estudiante"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_correo_key" ON "Estudiante"("correo");

-- CreateIndex
CREATE INDEX "PracticaLibre_aulaId_inicio_idx" ON "PracticaLibre"("aulaId", "inicio");

-- CreateIndex
CREATE INDEX "PrestamoDocente_aulaId_inicio_fin_idx" ON "PrestamoDocente"("aulaId", "inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "EquipoAudiovisual_codigoInventario_key" ON "EquipoAudiovisual"("codigoInventario");

-- CreateIndex
CREATE INDEX "PrestamoAudiovisual_estado_salidaEn_idx" ON "PrestamoAudiovisual"("estado", "salidaEn");

-- CreateIndex
CREATE UNIQUE INDEX "MotivoMulta_nombre_key" ON "MotivoMulta"("nombre");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permiso" ADD CONSTRAINT "Permiso_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aula" ADD CONSTRAINT "Aula_proyectoCurricularId_fkey" FOREIGN KEY ("proyectoCurricularId") REFERENCES "ProyectoCurricular"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignatura" ADD CONSTRAINT "Asignatura_proyectoCurricularId_fkey" FOREIGN KEY ("proyectoCurricularId") REFERENCES "ProyectoCurricular"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoAcademico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_proyectoCurricularId_fkey" FOREIGN KEY ("proyectoCurricularId") REFERENCES "ProyectoCurricular"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaDocente" ADD CONSTRAINT "AsistenciaDocente_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "ClaseProgramada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaDocente" ADD CONSTRAINT "AsistenciaDocente_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AulaSoftware" ADD CONSTRAINT "AulaSoftware_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AulaSoftware" ADD CONSTRAINT "AulaSoftware_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "Software"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticaLibre" ADD CONSTRAINT "PracticaLibre_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticaLibre" ADD CONSTRAINT "PracticaLibre_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoDocente" ADD CONSTRAINT "PrestamoDocente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoDocente" ADD CONSTRAINT "PrestamoDocente_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoAudiovisual" ADD CONSTRAINT "PrestamoAudiovisual_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoAudiovisual" ADD CONSTRAINT "PrestamoAudiovisual_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePrestamoAudiovisual" ADD CONSTRAINT "DetallePrestamoAudiovisual_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "PrestamoAudiovisual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePrestamoAudiovisual" ADD CONSTRAINT "DetallePrestamoAudiovisual_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "EquipoAudiovisual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoMulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observacion" ADD CONSTRAINT "Observacion_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limpieza" ADD CONSTRAINT "Limpieza_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoCredencial" ADD CONSTRAINT "AccesoCredencial_credencialId_fkey" FOREIGN KEY ("credencialId") REFERENCES "CredencialOperativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoCredencial" ADD CONSTRAINT "AccesoCredencial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
