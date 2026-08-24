ALTER TABLE "Aula"
  ADD COLUMN "anioAdquisicion" INTEGER,
  ADD COLUMN "marca" TEXT,
  ADD COLUMN "modelo" TEXT,
  ADD COLUMN "renovacionTecnologica" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pendienteIntervencion" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AulaProyectoCurricular" (
  "aulaId" UUID NOT NULL,
  "proyectoCurricularId" UUID NOT NULL,
  CONSTRAINT "AulaProyectoCurricular_pkey" PRIMARY KEY ("aulaId", "proyectoCurricularId"),
  CONSTRAINT "AulaProyectoCurricular_aulaId_fkey"
    FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AulaProyectoCurricular_proyectoCurricularId_fkey"
    FOREIGN KEY ("proyectoCurricularId") REFERENCES "ProyectoCurricular"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AulaProyectoCurricular_proyectoCurricularId_idx"
  ON "AulaProyectoCurricular"("proyectoCurricularId");

INSERT INTO "AulaProyectoCurricular" ("aulaId", "proyectoCurricularId")
SELECT "id", "proyectoCurricularId"
FROM "Aula"
WHERE "proyectoCurricularId" IS NOT NULL
ON CONFLICT DO NOTHING;
