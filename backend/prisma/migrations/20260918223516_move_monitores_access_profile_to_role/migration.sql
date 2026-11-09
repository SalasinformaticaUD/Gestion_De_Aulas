-- La migración anterior ya almacena el acceso a Monitores directamente en
-- Rol. Esta migración se conserva en el historial para mantener el orden de
-- despliegue, pero no debe volver a crear las columnas ni intentar mover datos
-- desde Usuario.
UPDATE "Rol"
SET "perfilMonitores" = 'ADMIN', "dependenciaMonitores" = NULL
WHERE "nombre" = 'ADMINISTRADOR' AND "perfilMonitores" IS NULL;
