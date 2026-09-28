/*
  Warnings:

  - You are about to drop the column `dependenciaMonitores` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `perfilMonitores` on the `Usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Rol" ADD COLUMN     "dependenciaMonitores" "DependenciaMonitores",
ADD COLUMN     "perfilMonitores" "PerfilMonitores";

-- Preserve the prior temporary user-level setup while moving it to each cargo.
UPDATE "Rol" AS rol
SET "perfilMonitores" = usuario."perfilMonitores",
    "dependenciaMonitores" = usuario."dependenciaMonitores"
FROM "UsuarioRol" AS usuarioRol
JOIN "Usuario" AS usuario ON usuario.id = usuarioRol."usuarioId"
WHERE rol.id = usuarioRol."rolId"
  AND usuario."perfilMonitores" IS NOT NULL;

-- Keep the existing platform administrator enabled after the migration.
UPDATE "Rol"
SET "perfilMonitores" = 'ADMIN', "dependenciaMonitores" = NULL
WHERE "nombre" = 'ADMINISTRADOR' AND "perfilMonitores" IS NULL;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "dependenciaMonitores",
DROP COLUMN "perfilMonitores";
