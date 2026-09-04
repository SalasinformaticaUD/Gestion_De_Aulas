ALTER TABLE "EquipoAudiovisual"
ADD COLUMN "marca" TEXT,
ADD COLUMN "modelo" TEXT;

ALTER TABLE "PrestamoAudiovisual"
ADD COLUMN "observacionesPrestamo" TEXT,
ADD COLUMN "devolucionCompleta" BOOLEAN;
