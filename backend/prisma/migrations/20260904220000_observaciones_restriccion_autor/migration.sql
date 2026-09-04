-- Retira el tipo semanal y añade vigencia explícita y autor a las observaciones.
ALTER TABLE "Observacion"
  ADD COLUMN "autorId" UUID,
  ADD COLUMN "vigenteDesde" TIMESTAMP(3);

UPDATE "Observacion"
SET "vigenteDesde" = "creadoEn"
WHERE "tipo" = 'RESTRICCION';

ALTER TABLE "Observacion" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "Observacion" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;
UPDATE "Observacion" SET "tipo" = 'GENERAL' WHERE "tipo" = 'SEMANAL';
DROP TYPE "TipoObservacion";
CREATE TYPE "TipoObservacion" AS ENUM ('GENERAL', 'NOVEDAD', 'RESTRICCION');
ALTER TABLE "Observacion" ALTER COLUMN "tipo" TYPE "TipoObservacion" USING "tipo"::"TipoObservacion";
ALTER TABLE "Observacion" ALTER COLUMN "tipo" SET DEFAULT 'GENERAL';

CREATE INDEX "Observacion_autorId_creadoEn_idx" ON "Observacion"("autorId", "creadoEn");
CREATE INDEX "Observacion_aulaId_tipo_vigenteDesde_vigenteHasta_idx"
  ON "Observacion"("aulaId", "tipo", "vigenteDesde", "vigenteHasta");

ALTER TABLE "Observacion"
  ADD CONSTRAINT "Observacion_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recupera autores de observaciones existentes cuando la auditoría dispone del evento CREATE.
UPDATE "Observacion" AS observacion
SET "autorId" = origen."usuarioId"
FROM (
  SELECT DISTINCT ON ("entidadId") "entidadId", "usuarioId"
  FROM "Auditoria"
  WHERE "entidad" = 'Observacion'
    AND "accion" = 'CREATE'
    AND "usuarioId" IS NOT NULL
  ORDER BY "entidadId", "creadoEn" ASC
) AS origen
WHERE observacion."id"::text = origen."entidadId"
  AND observacion."autorId" IS NULL;
