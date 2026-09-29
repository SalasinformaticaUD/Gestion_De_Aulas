-- CreateEnum
CREATE TYPE "EstadoImportacionSolicitud" AS ENUM ('PROCESANDO', 'COMPLETA', 'PARCIAL', 'FALLIDA');

-- CreateEnum
CREATE TYPE "EstadoSolicitudInstalacion" AS ENUM ('PENDIENTE_REVISION', 'REQUIERE_AJUSTES', 'APROBADA_PARCIAL', 'APROBADA', 'EN_EJECUCION', 'FINALIZADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoRevisionItemSolicitud" AS ENUM ('PENDIENTE', 'VALIDADO', 'REQUIERE_AJUSTES', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "EstadoNormalizacionSolicitud" AS ENUM ('PENDIENTE', 'COINCIDENCIA', 'NUEVO', 'AMBIGUO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "ImportacionSolicitudInstalacion" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "nombreArchivo" TEXT NOT NULL,
    "hashArchivo" TEXT NOT NULL,
    "estado" "EstadoImportacionSolicitud" NOT NULL DEFAULT 'PROCESANDO',
    "totalFilas" INTEGER NOT NULL DEFAULT 0,
    "solicitudesCreadas" INTEGER NOT NULL DEFAULT 0,
    "filasDuplicadas" INTEGER NOT NULL DEFAULT 0,
    "filasObservadas" INTEGER NOT NULL DEFAULT 0,
    "filasRechazadas" INTEGER NOT NULL DEFAULT 0,
    "errores" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),

    CONSTRAINT "ImportacionSolicitudInstalacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudInstalacion" (
    "id" UUID NOT NULL,
    "importacionId" UUID NOT NULL,
    "identificadorOrigen" TEXT,
    "filaOrigen" INTEGER NOT NULL,
    "fechaInicioFormulario" TIMESTAMP(3),
    "fechaPeticion" TIMESTAMP(3) NOT NULL,
    "correoRespondienteOriginal" TEXT,
    "nombreRespondienteOriginal" TEXT,
    "docenteId" UUID,
    "docenteNombreOriginal" TEXT,
    "docenteCorreoOriginal" TEXT,
    "proyectoCurricularId" UUID,
    "proyectoCurricularOriginal" TEXT,
    "periodoId" UUID,
    "observacionGeneral" TEXT,
    "consentimientoDatos" BOOLEAN,
    "estado" "EstadoSolicitudInstalacion" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "alertas" JSONB,
    "datosOriginales" JSONB NOT NULL,
    "revisadaPorId" UUID,
    "revisadaEn" TIMESTAMP(3),
    "aprobadaEn" TIMESTAMP(3),
    "rechazadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudInstalacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSolicitudInstalacion" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "posicion" INTEGER NOT NULL,
    "asignaturaId" UUID,
    "asignaturaOriginal" TEXT,
    "observaciones" TEXT,
    "estadoRevision" "EstadoRevisionItemSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "alertas" JSONB,
    "datosOriginales" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemSolicitudInstalacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSolicitudAula" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "posicion" INTEGER NOT NULL,
    "aulaId" UUID,
    "valorOriginal" TEXT NOT NULL,
    "valorNormalizado" TEXT,
    "estado" "EstadoNormalizacionSolicitud" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "ItemSolicitudAula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareSolicitado" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "posicion" INTEGER NOT NULL,
    "softwareId" UUID,
    "nombreOriginal" TEXT NOT NULL,
    "versionOriginal" TEXT,
    "nombreNormalizado" TEXT,
    "versionNormalizada" TEXT,
    "estado" "EstadoNormalizacionSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "revisadoPorId" UUID,
    "revisadoEn" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoftwareSolicitado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudSoftwareTarea" (
    "softwareSolicitadoId" UUID NOT NULL,
    "itemAulaId" UUID NOT NULL,
    "tareaId" UUID NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudSoftwareTarea_pkey" PRIMARY KEY ("softwareSolicitadoId","itemAulaId")
);

-- CreateTable
CREATE TABLE "AliasSoftware" (
    "id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasNormalizado" TEXT NOT NULL,
    "softwareId" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AliasSoftware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AliasAula" (
    "id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasNormalizado" TEXT NOT NULL,
    "aulaId" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AliasAula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportacionSolicitudInstalacion_hashArchivo_key" ON "ImportacionSolicitudInstalacion"("hashArchivo");

-- CreateIndex
CREATE INDEX "ImportacionSolicitudInstalacion_estado_creadoEn_idx" ON "ImportacionSolicitudInstalacion"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "ImportacionSolicitudInstalacion_usuarioId_creadoEn_idx" ON "ImportacionSolicitudInstalacion"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "SolicitudInstalacion_identificadorOrigen_idx" ON "SolicitudInstalacion"("identificadorOrigen");

-- CreateIndex
CREATE INDEX "SolicitudInstalacion_estado_fechaPeticion_idx" ON "SolicitudInstalacion"("estado", "fechaPeticion");

-- CreateIndex
CREATE INDEX "SolicitudInstalacion_periodoId_estado_idx" ON "SolicitudInstalacion"("periodoId", "estado");

-- CreateIndex
CREATE INDEX "SolicitudInstalacion_docenteId_fechaPeticion_idx" ON "SolicitudInstalacion"("docenteId", "fechaPeticion");

-- CreateIndex
CREATE INDEX "SolicitudInstalacion_proyectoCurricularId_fechaPeticion_idx" ON "SolicitudInstalacion"("proyectoCurricularId", "fechaPeticion");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudInstalacion_importacionId_filaOrigen_key" ON "SolicitudInstalacion"("importacionId", "filaOrigen");

-- CreateIndex
CREATE INDEX "ItemSolicitudInstalacion_asignaturaId_idx" ON "ItemSolicitudInstalacion"("asignaturaId");

-- CreateIndex
CREATE INDEX "ItemSolicitudInstalacion_estadoRevision_idx" ON "ItemSolicitudInstalacion"("estadoRevision");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSolicitudInstalacion_solicitudId_posicion_key" ON "ItemSolicitudInstalacion"("solicitudId", "posicion");

-- CreateIndex
CREATE INDEX "ItemSolicitudAula_aulaId_idx" ON "ItemSolicitudAula"("aulaId");

-- CreateIndex
CREATE INDEX "ItemSolicitudAula_estado_idx" ON "ItemSolicitudAula"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSolicitudAula_itemId_posicion_key" ON "ItemSolicitudAula"("itemId", "posicion");

-- CreateIndex
CREATE INDEX "SoftwareSolicitado_softwareId_idx" ON "SoftwareSolicitado"("softwareId");

-- CreateIndex
CREATE INDEX "SoftwareSolicitado_estado_idx" ON "SoftwareSolicitado"("estado");

-- CreateIndex
CREATE INDEX "SoftwareSolicitado_nombreNormalizado_versionNormalizada_idx" ON "SoftwareSolicitado"("nombreNormalizado", "versionNormalizada");

-- CreateIndex
CREATE UNIQUE INDEX "SoftwareSolicitado_itemId_posicion_key" ON "SoftwareSolicitado"("itemId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudSoftwareTarea_tareaId_key" ON "SolicitudSoftwareTarea"("tareaId");

-- CreateIndex
CREATE INDEX "SolicitudSoftwareTarea_itemAulaId_idx" ON "SolicitudSoftwareTarea"("itemAulaId");

-- CreateIndex
CREATE UNIQUE INDEX "AliasSoftware_aliasNormalizado_key" ON "AliasSoftware"("aliasNormalizado");

-- CreateIndex
CREATE INDEX "AliasSoftware_softwareId_activo_idx" ON "AliasSoftware"("softwareId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "AliasAula_aliasNormalizado_key" ON "AliasAula"("aliasNormalizado");

-- CreateIndex
CREATE INDEX "AliasAula_aulaId_activo_idx" ON "AliasAula"("aulaId", "activo");

-- AddForeignKey
ALTER TABLE "ImportacionSolicitudInstalacion" ADD CONSTRAINT "ImportacionSolicitudInstalacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInstalacion" ADD CONSTRAINT "SolicitudInstalacion_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "ImportacionSolicitudInstalacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInstalacion" ADD CONSTRAINT "SolicitudInstalacion_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInstalacion" ADD CONSTRAINT "SolicitudInstalacion_proyectoCurricularId_fkey" FOREIGN KEY ("proyectoCurricularId") REFERENCES "ProyectoCurricular"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInstalacion" ADD CONSTRAINT "SolicitudInstalacion_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoAcademico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInstalacion" ADD CONSTRAINT "SolicitudInstalacion_revisadaPorId_fkey" FOREIGN KEY ("revisadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitudInstalacion" ADD CONSTRAINT "ItemSolicitudInstalacion_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInstalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitudInstalacion" ADD CONSTRAINT "ItemSolicitudInstalacion_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitudAula" ADD CONSTRAINT "ItemSolicitudAula_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemSolicitudInstalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitudAula" ADD CONSTRAINT "ItemSolicitudAula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareSolicitado" ADD CONSTRAINT "SoftwareSolicitado_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemSolicitudInstalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareSolicitado" ADD CONSTRAINT "SoftwareSolicitado_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "Software"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareSolicitado" ADD CONSTRAINT "SoftwareSolicitado_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudSoftwareTarea" ADD CONSTRAINT "SolicitudSoftwareTarea_softwareSolicitadoId_fkey" FOREIGN KEY ("softwareSolicitadoId") REFERENCES "SoftwareSolicitado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudSoftwareTarea" ADD CONSTRAINT "SolicitudSoftwareTarea_itemAulaId_fkey" FOREIGN KEY ("itemAulaId") REFERENCES "ItemSolicitudAula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudSoftwareTarea" ADD CONSTRAINT "SolicitudSoftwareTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasSoftware" ADD CONSTRAINT "AliasSoftware_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "Software"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasAula" ADD CONSTRAINT "AliasAula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
