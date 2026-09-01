-- Preserve operational history while removing an aula from active management.
ALTER TABLE "Aula" ADD COLUMN "eliminadoEn" TIMESTAMP(3);

CREATE INDEX "Aula_eliminadoEn_idx" ON "Aula"("eliminadoEn");
