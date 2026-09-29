-- CreateEnum
CREATE TYPE "PerfilMonitores" AS ENUM ('ADMIN', 'LIDER');

-- CreateEnum
CREATE TYPE "DependenciaMonitores" AS ENUM ('PHYSICS', 'INFORMATICS_LABS', 'ELECTRICAL');

-- AlterTable
ALTER TABLE "DecisionTareaOperativa" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InformeSeguimientoTarea" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ResponsableTareaOperativa" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tarea" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- Store the Monitores access profile on the shared role. This avoids a
-- temporary user-level representation and makes the migration deterministic.
ALTER TABLE "Rol" ADD COLUMN     "dependenciaMonitores" "DependenciaMonitores",
ADD COLUMN     "perfilMonitores" "PerfilMonitores";

-- Preserve access for an administrator role that already exists. Fresh
-- databases receive the same configuration from prisma/seed.ts.
UPDATE "Rol"
SET "perfilMonitores" = 'ADMIN', "dependenciaMonitores" = NULL
WHERE "nombre" = 'ADMINISTRADOR';
