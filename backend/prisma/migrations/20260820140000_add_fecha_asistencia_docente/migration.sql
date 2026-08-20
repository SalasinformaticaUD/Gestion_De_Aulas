-- La fecha identifica la ocurrencia diaria de una clase semanal.
ALTER TABLE "AsistenciaDocente"
ADD COLUMN "fecha" DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE UNIQUE INDEX "AsistenciaDocente_claseId_fecha_key"
ON "AsistenciaDocente"("claseId", "fecha");

CREATE INDEX "AsistenciaDocente_fecha_estado_idx"
ON "AsistenciaDocente"("fecha", "estado");
