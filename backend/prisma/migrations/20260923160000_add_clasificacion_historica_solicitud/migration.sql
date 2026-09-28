-- AlterTable
ALTER TABLE "SolicitudInstalacion"
ADD COLUMN "historicaAlImportar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "motivoHistorialInicial" TEXT;

-- CreateIndex
CREATE INDEX "SolicitudInstalacion_historicaAlImportar_fechaPeticion_idx"
ON "SolicitudInstalacion"("historicaAlImportar", "fechaPeticion");
