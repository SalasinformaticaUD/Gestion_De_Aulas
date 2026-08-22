ALTER TABLE "Multa"
  ADD COLUMN "impuestaPorId" UUID,
  ADD COLUMN "cumplidaEn" TIMESTAMP(3),
  ADD COLUMN "cumplidaPorId" UUID,
  ADD COLUMN "elementosEntregados" TEXT,
  ADD COLUMN "anuladaEn" TIMESTAMP(3),
  ADD COLUMN "anuladaPorId" UUID,
  ADD COLUMN "motivoAnulacion" TEXT;

CREATE INDEX "Multa_estudianteId_estado_idx" ON "Multa"("estudianteId", "estado");
CREATE INDEX "Multa_motivoId_fecha_idx" ON "Multa"("motivoId", "fecha");

ALTER TABLE "Multa" ADD CONSTRAINT "Multa_impuestaPorId_fkey" FOREIGN KEY ("impuestaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_cumplidaPorId_fkey" FOREIGN KEY ("cumplidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
