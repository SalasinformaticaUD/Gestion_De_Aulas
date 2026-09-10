ALTER TABLE "PracticaLibre"
  ADD COLUMN "atendidoPorId" UUID;

CREATE INDEX "PracticaLibre_atendidoPorId_inicio_idx"
  ON "PracticaLibre"("atendidoPorId", "inicio");

ALTER TABLE "PracticaLibre"
  ADD CONSTRAINT "PracticaLibre_atendidoPorId_fkey"
  FOREIGN KEY ("atendidoPorId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
