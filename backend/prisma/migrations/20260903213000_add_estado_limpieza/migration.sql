CREATE TYPE "EstadoLimpieza" AS ENUM ('REALIZADA', 'NOVEDAD');

ALTER TABLE "Limpieza"
ADD COLUMN "estado" "EstadoLimpieza" NOT NULL DEFAULT 'REALIZADA';

-- Los registros existentes que tenían una observación se registraron como
-- novedades antes de contar con un estado explícito.
UPDATE "Limpieza"
SET "estado" = 'NOVEDAD'
WHERE "observacion" IS NOT NULL AND BTRIM("observacion") <> '';
