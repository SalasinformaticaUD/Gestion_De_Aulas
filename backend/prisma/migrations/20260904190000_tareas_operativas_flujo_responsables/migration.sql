-- Implementa el flujo terminal, responsables múltiples e historial lógico de tareas.
ALTER TABLE "Tarea"
  ADD COLUMN "completadaEn" TIMESTAMP(3),
  ADD COLUMN "canceladaEn" TIMESTAMP(3),
  ADD COLUMN "motivoCancelacion" TEXT;

UPDATE "Tarea"
SET "completadaEn" = COALESCE("fin", "actualizadoEn")
WHERE "estado" = 'COMPLETADA';

UPDATE "Tarea"
SET "canceladaEn" = "actualizadoEn",
    "motivoCancelacion" = 'Cancelación registrada antes de solicitar un motivo.'
WHERE "estado" = 'CANCELADA';

ALTER TABLE "InformeSeguimientoTarea"
  ALTER COLUMN "accionesPendientes" DROP NOT NULL;

CREATE TABLE "ResponsableTareaOperativa" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tareaId" UUID NOT NULL,
  "usuarioId" UUID NOT NULL,
  "agregadoPorId" UUID NOT NULL,
  "agregadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResponsableTareaOperativa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResponsableTareaOperativa_tareaId_usuarioId_key"
  ON "ResponsableTareaOperativa"("tareaId", "usuarioId");
CREATE INDEX "ResponsableTareaOperativa_usuarioId_agregadoEn_idx"
  ON "ResponsableTareaOperativa"("usuarioId", "agregadoEn");

ALTER TABLE "ResponsableTareaOperativa"
  ADD CONSTRAINT "ResponsableTareaOperativa_tareaId_fkey"
  FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResponsableTareaOperativa"
  ADD CONSTRAINT "ResponsableTareaOperativa_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResponsableTareaOperativa"
  ADD CONSTRAINT "ResponsableTareaOperativa_agregadoPorId_fkey"
  FOREIGN KEY ("agregadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
