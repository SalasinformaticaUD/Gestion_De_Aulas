-- Conserva quién creó y quién canceló cada tarea para emitir notificaciones trazables.
ALTER TABLE "Tarea"
  ADD COLUMN "creadorId" UUID,
  ADD COLUMN "canceladaPorId" UUID,
  ADD COLUMN "estadoAntesCancelacion" "EstadoTarea";

CREATE INDEX "Tarea_creadorId_estado_idx" ON "Tarea"("creadorId", "estado");
CREATE INDEX "Tarea_canceladaPorId_idx" ON "Tarea"("canceladaPorId");

ALTER TABLE "Tarea"
  ADD CONSTRAINT "Tarea_creadorId_fkey"
  FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tarea"
  ADD CONSTRAINT "Tarea_canceladaPorId_fkey"
  FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
