-- Alinea la relación opcional de Observacion con el comportamiento definido
-- en Prisma: si se elimina el aula, la observación conserva su historial.
ALTER TABLE "Observacion"
DROP CONSTRAINT "Observacion_aulaId_fkey";

ALTER TABLE "Observacion"
ADD CONSTRAINT "Observacion_aulaId_fkey"
FOREIGN KEY ("aulaId") REFERENCES "Aula"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL truncó automáticamente el nombre original del índice. Se usa el
-- nombre que Prisma calcula para evitar diferencias permanentes de esquema.
ALTER INDEX "NotificacionPanelDescartada_usuarioId_alertaId_fecha_horaInicio"
RENAME TO "NotificacionPanelDescartada_usuarioId_alertaId_fecha_horaIn_key";
