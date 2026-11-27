ALTER TABLE "VerificacionDocumental" ADD COLUMN "versionComparacion" VARCHAR(30), ADD COLUMN "resultadoComparacion" JSONB;
ALTER TABLE "HallazgoVerificacionDocumental" ADD COLUMN "pagina" INTEGER, ADD COLUMN "evidencia" JSONB;
