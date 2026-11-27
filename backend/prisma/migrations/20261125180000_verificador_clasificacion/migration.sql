ALTER TABLE "VerificacionDocumental" ADD COLUMN "versionClasificacion" VARCHAR(30);
ALTER TABLE "DocumentoVerificacionDocumental"
 ADD COLUMN "estadoClasificacion" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
 ADD COLUMN "puntajeClasificacion" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "evidenciasClasificacion" JSONB,
 ADD COLUMN "requiereRevisionManual" BOOLEAN NOT NULL DEFAULT true;
