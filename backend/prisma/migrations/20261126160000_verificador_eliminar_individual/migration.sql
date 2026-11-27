-- Permiso independiente, administrable desde los roles existentes.
INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT gen_random_uuid(), 'VERIFICADOR_DOCUMENTAL_ELIMINAR',
       'Eliminar individualmente verificaciones documentales y sus resultados (requiere LEER)', id
FROM "Modulo" WHERE codigo = 'VERIFICADOR_DOCUMENTAL'
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion, "moduloId" = EXCLUDED."moduloId";

-- Mismo acceso administrativo inicial del catálogo existente. Otros roles
-- reciben el permiso únicamente mediante asignación del administrador.
INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rol.id, permiso.id FROM "Rol" rol CROSS JOIN "Permiso" permiso
WHERE rol.nombre = 'ADMINISTRADOR' AND permiso.codigo = 'VERIFICADOR_DOCUMENTAL_ELIMINAR'
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
