ALTER TABLE "SolicitudSoftwareTarea"
ADD COLUMN "inventarioConfirmadoPorId" UUID,
ADD COLUMN "inventarioConfirmadoEn" TIMESTAMP(3);

CREATE INDEX "SolicitudSoftwareTarea_inventarioConfirmadoPorId_idx"
ON "SolicitudSoftwareTarea"("inventarioConfirmadoPorId");

ALTER TABLE "SolicitudSoftwareTarea"
ADD CONSTRAINT "SolicitudSoftwareTarea_inventarioConfirmadoPorId_fkey"
FOREIGN KEY ("inventarioConfirmadoPorId") REFERENCES "Usuario"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
