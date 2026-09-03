-- DropForeignKey
ALTER TABLE "PracticaLibre" DROP CONSTRAINT "PracticaLibre_docenteId_fkey";

-- DropForeignKey
ALTER TABLE "PracticaLibre" DROP CONSTRAINT "PracticaLibre_estudianteId_fkey";

-- DropIndex
DROP INDEX "Aula_eliminadoEn_idx";

-- DropIndex
DROP INDEX "ClaseProgramada_periodoId_semana_idx";

-- DropIndex
DROP INDEX "Estudiante_correo_key";

-- AlterTable
ALTER TABLE "PrestamoAudiovisual" ALTER COLUMN "responsableTipo" DROP DEFAULT,
ALTER COLUMN "docenteNombre" DROP DEFAULT,
ALTER COLUMN "docenteDocumento" DROP DEFAULT,
ALTER COLUMN "salonTexto" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "PracticaLibre" ADD CONSTRAINT "PracticaLibre_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticaLibre" ADD CONSTRAINT "PracticaLibre_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
