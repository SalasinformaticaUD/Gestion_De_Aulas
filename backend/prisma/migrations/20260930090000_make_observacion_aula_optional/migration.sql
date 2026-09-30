-- Permite registrar observaciones operativas fuera de un aula y conservar una ubicación descriptiva.
ALTER TABLE "Observacion"
  ALTER COLUMN "aulaId" DROP NOT NULL,
  ADD COLUMN "ubicacionTexto" TEXT;
