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

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "dependenciaMonitores" "DependenciaMonitores",
ADD COLUMN     "perfilMonitores" "PerfilMonitores";
