ALTER TABLE "PrestamoDocente"
ADD COLUMN "encargadoId" UUID;

CREATE INDEX "PrestamoDocente_encargadoId_idx"
ON "PrestamoDocente"("encargadoId");

ALTER TABLE "PrestamoDocente"
ADD CONSTRAINT "PrestamoDocente_encargadoId_fkey"
FOREIGN KEY ("encargadoId") REFERENCES "Usuario"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
