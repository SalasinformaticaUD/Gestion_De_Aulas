ALTER TABLE "Aula" ADD COLUMN "responsableId" UUID;

CREATE INDEX "Aula_responsableId_idx" ON "Aula"("responsableId");

ALTER TABLE "Aula"
  ADD CONSTRAINT "Aula_responsableId_fkey"
  FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
