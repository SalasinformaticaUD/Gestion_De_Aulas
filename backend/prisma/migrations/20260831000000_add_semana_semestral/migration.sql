ALTER TABLE "ClaseProgramada" ADD COLUMN "semana" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "ClaseProgramada_periodoId_semana_idx" ON "ClaseProgramada"("periodoId", "semana");
