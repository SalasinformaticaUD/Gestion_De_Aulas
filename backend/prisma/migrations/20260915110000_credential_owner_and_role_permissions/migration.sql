-- Persist the creator so deletion and permission management can be enforced.
ALTER TABLE "CredencialOperativa" ADD COLUMN "creadorId" UUID;

-- Legacy credentials were created with a full-access record for their creator.
UPDATE "CredencialOperativa" c
SET "creadorId" = (
  SELECT a."usuarioId"
  FROM "AccesoCredencial" a
  WHERE a."credencialId" = c."id"
  ORDER BY a."puedeEditar" DESC, a."usuarioId"
  LIMIT 1
)
WHERE c."creadorId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "AccesoCredencial" a
    WHERE a."credencialId" = c."id"
  );

-- Some legacy rows can predate access records.  Preserve them by assigning the
-- seeded administrator, rather than making the non-null migration fail.
UPDATE "CredencialOperativa" c
SET "creadorId" = admin."id"
FROM "Usuario" admin
WHERE c."creadorId" IS NULL
  AND admin."nombreUsuario" = 'admin';

ALTER TABLE "CredencialOperativa" ALTER COLUMN "creadorId" SET NOT NULL;
ALTER TABLE "CredencialOperativa" ADD CONSTRAINT "CredencialOperativa_creadorId_fkey"
  FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CredencialOperativa_creadorId_idx" ON "CredencialOperativa"("creadorId");

ALTER TABLE "CredencialRol" ADD COLUMN "puedeVer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CredencialRol" ADD COLUMN "puedeEditar" BOOLEAN NOT NULL DEFAULT false;
