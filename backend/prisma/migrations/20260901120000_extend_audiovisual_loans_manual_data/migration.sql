ALTER TABLE "PrestamoAudiovisual"
ALTER COLUMN "docenteId" DROP NOT NULL,
ALTER COLUMN "aulaId" DROP NOT NULL;

ALTER TABLE "PrestamoAudiovisual"
ADD COLUMN "responsableTipo" TEXT NOT NULL DEFAULT 'MONITOR',
ADD COLUMN "docenteNombre" TEXT NOT NULL DEFAULT 'Sin información',
ADD COLUMN "docenteDocumento" TEXT NOT NULL DEFAULT 'Sin información',
ADD COLUMN "salonTexto" TEXT NOT NULL DEFAULT 'Sin ubicación registrada',
ADD COLUMN "elementosAdicionales" JSONB,
ADD COLUMN "recibidoPorTipo" TEXT,
ADD COLUMN "observacionesDevolucion" TEXT;
