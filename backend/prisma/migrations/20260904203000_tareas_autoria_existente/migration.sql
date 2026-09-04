-- Recupera el creador de tareas existentes desde el primer evento CREATE de auditoría.
UPDATE "Tarea" AS tarea
SET "creadorId" = origen."usuarioId"
FROM (
  SELECT DISTINCT ON ("entidadId") "entidadId", "usuarioId"
  FROM "Auditoria"
  WHERE "entidad" = 'Tarea'
    AND "accion" = 'CREATE'
    AND "usuarioId" IS NOT NULL
  ORDER BY "entidadId", "creadoEn" ASC
) AS origen
WHERE tarea."id"::text = origen."entidadId"
  AND tarea."creadorId" IS NULL;
