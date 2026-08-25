ALTER TABLE "PrestamoAudiovisual"
ADD COLUMN "canceladoPorId" UUID,
ADD COLUMN "canceladoEn" TIMESTAMP(3),
ADD COLUMN "motivoCancelacion" TEXT;

ALTER TABLE "PrestamoAudiovisual"
ADD CONSTRAINT "PrestamoAudiovisual_canceladoPorId_fkey"
FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PrestamoAudiovisual_canceladoPorId_idx"
ON "PrestamoAudiovisual"("canceladoPorId");
