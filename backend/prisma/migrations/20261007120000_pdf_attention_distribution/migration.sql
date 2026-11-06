CREATE TABLE "ConfiguracionDistribucionPdf" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "activa" BOOLEAN NOT NULL DEFAULT false,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracionDistribucionPdf_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfiguracionDistribucionPdfUsuario" (
  "configuracionId" INTEGER NOT NULL,
  "usuarioId" UUID NOT NULL,
  "orden" INTEGER NOT NULL,
  CONSTRAINT "ConfiguracionDistribucionPdfUsuario_pkey"
    PRIMARY KEY ("configuracionId", "usuarioId")
);

CREATE UNIQUE INDEX "ConfiguracionDistribucionPdfUsuario_configuracionId_orden_key"
ON "ConfiguracionDistribucionPdfUsuario"("configuracionId", "orden");

CREATE INDEX "ConfiguracionDistribucionPdfUsuario_usuarioId_idx"
ON "ConfiguracionDistribucionPdfUsuario"("usuarioId");

ALTER TABLE "ConfiguracionDistribucionPdfUsuario"
ADD CONSTRAINT "ConfiguracionDistribucionPdfUsuario_configuracionId_fkey"
FOREIGN KEY ("configuracionId") REFERENCES "ConfiguracionDistribucionPdf"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConfiguracionDistribucionPdfUsuario"
ADD CONSTRAINT "ConfiguracionDistribucionPdfUsuario_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ConfiguracionDistribucionPdf" ("id", "activa", "actualizadoEn")
VALUES (1, false, CURRENT_TIMESTAMP);
