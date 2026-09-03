ALTER TABLE "PracticaLibre" ALTER COLUMN "estudianteId" DROP NOT NULL;

ALTER TABLE "PracticaLibre"
ADD COLUMN "docenteId" UUID,
ADD COLUMN "grupoId" UUID;

CREATE INDEX "PracticaLibre_grupoId_idx" ON "PracticaLibre"("grupoId");

ALTER TABLE "PracticaLibre"
ADD CONSTRAINT "PracticaLibre_docenteId_fkey"
FOREIGN KEY ("docenteId") REFERENCES "Docente"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
