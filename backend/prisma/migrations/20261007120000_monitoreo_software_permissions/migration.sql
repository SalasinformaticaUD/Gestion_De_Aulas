-- El módulo de monitoreo de software debe existir sin depender del seed.
INSERT INTO "Modulo" ("id", "codigo", "nombre", "activo")
VALUES (gen_random_uuid(), 'MONITOREO_SOFTWARE', 'Monitoreo de software', true)
ON CONFLICT ("codigo") DO UPDATE
SET "nombre" = EXCLUDED."nombre", "activo" = true;

INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT gen_random_uuid(), catalogo.codigo, catalogo.descripcion, modulo.id
FROM "Modulo" AS modulo
CROSS JOIN (
  VALUES
    ('MONITOREO_SOFTWARE_LEER', 'LEER en Monitoreo de software'),
    ('MONITOREO_SOFTWARE_EXPORTAR', 'EXPORTAR en Monitoreo de software')
) AS catalogo(codigo, descripcion)
WHERE modulo."codigo" = 'MONITOREO_SOFTWARE'
ON CONFLICT ("codigo") DO UPDATE
SET "descripcion" = EXCLUDED."descripcion", "moduloId" = EXCLUDED."moduloId";

-- El administrador conserva acceso total; si el rol no existe, no se inserta nada.
INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rol.id, permiso.id
FROM "Rol" AS rol
CROSS JOIN "Permiso" AS permiso
WHERE rol."nombre" = 'ADMINISTRADOR'
  AND permiso."codigo" IN ('MONITOREO_SOFTWARE_LEER', 'MONITOREO_SOFTWARE_EXPORTAR')
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
