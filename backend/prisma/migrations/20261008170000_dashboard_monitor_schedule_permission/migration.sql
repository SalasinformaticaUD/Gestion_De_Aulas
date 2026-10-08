-- El acceso al horario de Monitores desde Gestión de Aulas se administra
-- como una función independiente dentro de los permisos del Dashboard.
INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT
  gen_random_uuid(),
  'DASHBOARD_VER_HORARIO_MONITORES',
  'Permite consultar el horario de Monitores Aulas de Software desde el Dashboard.',
  modulo.id
FROM "Modulo" AS modulo
WHERE modulo."codigo" = 'DASHBOARD'
ON CONFLICT ("codigo") DO UPDATE
SET
  "descripcion" = EXCLUDED."descripcion",
  "moduloId" = EXCLUDED."moduloId";

-- La función queda habilitada inicialmente solo para el administrador. Desde
-- Administración > Usuarios puede asignarse después a otros cargos.
INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rol.id, permiso.id
FROM "Rol" AS rol
CROSS JOIN "Permiso" AS permiso
WHERE rol."nombre" = 'ADMINISTRADOR'
  AND permiso."codigo" = 'DASHBOARD_VER_HORARIO_MONITORES'
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
