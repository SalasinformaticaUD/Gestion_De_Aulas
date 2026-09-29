ALTER TABLE "SolicitudInstalacion"
ADD COLUMN "hashContenido" TEXT;

CREATE UNIQUE INDEX "SolicitudInstalacion_hashContenido_key"
ON "SolicitudInstalacion"("hashContenido");
