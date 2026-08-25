/*
  Warnings:

  - You are about to drop the column `estadoDevolucion` on the `DetallePrestamoAudiovisual` table. All the data in the column will be lost.
  - You are about to drop the column `estadoSalida` on the `DetallePrestamoAudiovisual` table. All the data in the column will be lost.
  - Made the column `aulaId` on table `PrestamoAudiovisual` required. This step will fail if there are existing NULL values in that column.
  - Made the column `version` on table `Software` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ResultadoImportacionSoftware" AS ENUM ('EXITOSA', 'PARCIAL', 'FALLIDA');

-- DropForeignKey
ALTER TABLE "DetallePrestamoAudiovisual" DROP CONSTRAINT "DetallePrestamoAudiovisual_prestamoId_fkey";

-- DropForeignKey
ALTER TABLE "PrestamoAudiovisual" DROP CONSTRAINT "PrestamoAudiovisual_aulaId_fkey";

-- DropIndex
DROP INDEX "AsistenciaDocente_claseId_idx";

-- DropIndex
DROP INDEX "PrestamoAudiovisual_canceladoPorId_idx";

-- AlterTable
ALTER TABLE "AsistenciaDocente" ALTER COLUMN "fecha" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "DetallePrestamoAudiovisual" DROP COLUMN "estadoDevolucion",
DROP COLUMN "estadoSalida",
ADD COLUMN     "estadoFisicoDevolucion" TEXT,
ADD COLUMN     "estadoFisicoSalida" TEXT,
ADD COLUMN     "estadoFuncionalDevolucion" TEXT,
ADD COLUMN     "estadoFuncionalSalida" TEXT;

-- AlterTable
ALTER TABLE "PrestamoAudiovisual" ADD COLUMN     "entregadoPorId" UUID,
ADD COLUMN     "recibidoPorId" UUID,
ALTER COLUMN "aulaId" SET NOT NULL,
ALTER COLUMN "salidaEn" DROP NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'SOLICITADO';

-- AlterTable
ALTER TABLE "Software" ALTER COLUMN "version" SET NOT NULL;

-- CreateTable
CREATE TABLE "ImportacionSoftware" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "nombreArchivo" TEXT,
    "totalRegistros" INTEGER NOT NULL,
    "registrosProcesados" INTEGER NOT NULL,
    "registrosConError" INTEGER NOT NULL,
    "resultado" "ResultadoImportacionSoftware" NOT NULL,
    "errores" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacionSoftware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantenimientoEquipoAudiovisual" (
    "id" UUID NOT NULL,
    "equipoId" UUID NOT NULL,
    "inicioEn" TIMESTAMP(3) NOT NULL,
    "finEn" TIMESTAMP(3),
    "observacion" TEXT,

    CONSTRAINT "MantenimientoEquipoAudiovisual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservacionEquipoAudiovisual" (
    "id" UUID NOT NULL,
    "equipoId" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservacionEquipoAudiovisual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportacionSoftware_creadoEn_idx" ON "ImportacionSoftware"("creadoEn");

-- CreateIndex
CREATE INDEX "ImportacionSoftware_usuarioId_creadoEn_idx" ON "ImportacionSoftware"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "MantenimientoEquipoAudiovisual_equipoId_inicioEn_idx" ON "MantenimientoEquipoAudiovisual"("equipoId", "inicioEn");

-- CreateIndex
CREATE INDEX "ObservacionEquipoAudiovisual_equipoId_creadoEn_idx" ON "ObservacionEquipoAudiovisual"("equipoId", "creadoEn");

-- CreateIndex
CREATE INDEX "AulaSoftware_softwareId_idx" ON "AulaSoftware"("softwareId");

-- CreateIndex
CREATE INDEX "DetallePrestamoAudiovisual_equipoId_idx" ON "DetallePrestamoAudiovisual"("equipoId");

-- CreateIndex
CREATE INDEX "EquipoAudiovisual_estado_tipo_idx" ON "EquipoAudiovisual"("estado", "tipo");

-- CreateIndex
CREATE INDEX "PrestamoAudiovisual_docenteId_salidaEn_idx" ON "PrestamoAudiovisual"("docenteId", "salidaEn");

-- CreateIndex
CREATE INDEX "PrestamoAudiovisual_aulaId_salidaEn_idx" ON "PrestamoAudiovisual"("aulaId", "salidaEn");

-- AddForeignKey
ALTER TABLE "ImportacionSoftware" ADD CONSTRAINT "ImportacionSoftware_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoAudiovisual" ADD CONSTRAINT "PrestamoAudiovisual_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoAudiovisual" ADD CONSTRAINT "PrestamoAudiovisual_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoAudiovisual" ADD CONSTRAINT "PrestamoAudiovisual_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePrestamoAudiovisual" ADD CONSTRAINT "DetallePrestamoAudiovisual_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "PrestamoAudiovisual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantenimientoEquipoAudiovisual" ADD CONSTRAINT "MantenimientoEquipoAudiovisual_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "EquipoAudiovisual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionEquipoAudiovisual" ADD CONSTRAINT "ObservacionEquipoAudiovisual_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "EquipoAudiovisual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
