-- El acceso a Gestión de Monitores pertenece a cada usuario, no a su cargo.
ALTER TABLE "Usuario"
ADD COLUMN "perfilMonitores" "PerfilMonitores",
ADD COLUMN "dependenciaMonitores" "DependenciaMonitores";

-- El administrador central conserva el acceso inicial. Los demás usuarios
-- deben habilitarse individualmente desde la administración de Usuarios.
UPDATE "Usuario" AS usuario
SET "perfilMonitores" = 'ADMIN',
    "dependenciaMonitores" = NULL
WHERE EXISTS (
  SELECT 1
  FROM "UsuarioRol" AS usuarioRol
  JOIN "Rol" AS rol ON rol.id = usuarioRol."rolId"
  WHERE usuarioRol."usuarioId" = usuario.id
    AND rol.nombre = 'ADMINISTRADOR'
);
