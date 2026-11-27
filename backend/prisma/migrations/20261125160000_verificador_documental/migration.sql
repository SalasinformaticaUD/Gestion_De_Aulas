-- CreateEnum
CREATE TYPE "EstadoVerificacionDocumental" AS ENUM ('BORRADOR', 'PENDIENTE', 'PROCESANDO', 'SATISFACTORIA', 'CON_INCONSISTENCIAS', 'INCOMPLETA', 'FALLIDA');

-- CreateEnum
CREATE TYPE "ModalidadCargaDocumental" AS ENUM ('PDF_UNIFICADO', 'PDF_SEPARADOS');

-- CreateEnum
CREATE TYPE "TipoIdentificacionContratista" AS ENUM ('CC', 'CE', 'TI', 'PASAPORTE', 'PEP', 'PPT', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumentoContratista" AS ENUM ('PERSONERIA', 'PROCURADURIA', 'CONTRALORIA', 'POLICIA_JUDICIAL', 'MEDIDAS_CORRECTIVAS', 'DELITOS_SEXUALES', 'REDAM', 'DECLARACION_VERACIDAD', 'SEGURIDAD_SOCIAL', 'NO_RECONOCIDO');

-- CreateTable
CREATE TABLE "VerificacionDocumental" (
    "id" UUID NOT NULL,
    "tipoIdentificacion" "TipoIdentificacionContratista" NOT NULL,
    "numeroIdentificacion" VARCHAR(40) NOT NULL,
    "nombreCompleto" VARCHAR(200) NOT NULL,
    "fechaSolicitud" DATE NOT NULL,
    "modalidadCarga" "ModalidadCargaDocumental" NOT NULL,
    "estado" "EstadoVerificacionDocumental" NOT NULL DEFAULT 'BORRADOR',
    "creadoPorId" UUID NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "finalizadoEn" TIMESTAMP(3),

    CONSTRAINT "VerificacionDocumental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoVerificacionDocumental" (
    "id" UUID NOT NULL,
    "verificacionId" UUID NOT NULL,
    "nombreOriginal" VARCHAR(255) NOT NULL,
    "claveAlmacenamiento" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "tamanoBytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "ordenCarga" INTEGER NOT NULL,
    "numeroPaginas" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoVerificacionDocumental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoVerificacionDocumental" (
    "id" UUID NOT NULL,
    "archivoId" UUID NOT NULL,
    "tipo" "TipoDocumentoContratista" NOT NULL,
    "paginaInicio" INTEGER NOT NULL,
    "paginaFin" INTEGER NOT NULL,
    "textoExtraido" TEXT,
    "camposExtraidos" JSONB,
    "requiereOcr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DocumentoVerificacionDocumental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallazgoVerificacionDocumental" (
    "id" UUID NOT NULL,
    "verificacionId" UUID NOT NULL,
    "documentoId" UUID,
    "codigo" VARCHAR(80) NOT NULL,
    "campo" VARCHAR(100) NOT NULL,
    "valorEncontrado" TEXT,
    "valorReferencia" TEXT,
    "observacion" TEXT NOT NULL,
    "accionSugerida" TEXT NOT NULL,
    "requiereRevisionManual" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallazgoVerificacionDocumental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificacionDocumental_creadoEn_id_idx" ON "VerificacionDocumental"("creadoEn", "id");

-- CreateIndex
CREATE INDEX "VerificacionDocumental_numeroIdentificacion_idx" ON "VerificacionDocumental"("numeroIdentificacion");

-- CreateIndex
CREATE INDEX "VerificacionDocumental_estado_creadoEn_idx" ON "VerificacionDocumental"("estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "ArchivoVerificacionDocumental_claveAlmacenamiento_key" ON "ArchivoVerificacionDocumental"("claveAlmacenamiento");

-- CreateIndex
CREATE INDEX "ArchivoVerificacionDocumental_verificacionId_sha256_idx" ON "ArchivoVerificacionDocumental"("verificacionId", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "ArchivoVerificacionDocumental_verificacionId_ordenCarga_key" ON "ArchivoVerificacionDocumental"("verificacionId", "ordenCarga");

-- CreateIndex
CREATE INDEX "DocumentoVerificacionDocumental_archivoId_idx" ON "DocumentoVerificacionDocumental"("archivoId");

-- CreateIndex
CREATE INDEX "HallazgoVerificacionDocumental_verificacionId_idx" ON "HallazgoVerificacionDocumental"("verificacionId");

-- CreateIndex
CREATE INDEX "HallazgoVerificacionDocumental_documentoId_idx" ON "HallazgoVerificacionDocumental"("documentoId");

-- AddForeignKey
ALTER TABLE "VerificacionDocumental" ADD CONSTRAINT "VerificacionDocumental_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoVerificacionDocumental" ADD CONSTRAINT "ArchivoVerificacionDocumental_verificacionId_fkey" FOREIGN KEY ("verificacionId") REFERENCES "VerificacionDocumental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVerificacionDocumental" ADD CONSTRAINT "DocumentoVerificacionDocumental_archivoId_fkey" FOREIGN KEY ("archivoId") REFERENCES "ArchivoVerificacionDocumental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallazgoVerificacionDocumental" ADD CONSTRAINT "HallazgoVerificacionDocumental_verificacionId_fkey" FOREIGN KEY ("verificacionId") REFERENCES "VerificacionDocumental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallazgoVerificacionDocumental" ADD CONSTRAINT "HallazgoVerificacionDocumental_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoVerificacionDocumental"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Catálogo disponible en Administración sin ejecutar el seed de desarrollo.
INSERT INTO "Modulo" ("id", "codigo", "nombre", "activo")
VALUES (gen_random_uuid(), 'VERIFICADOR_DOCUMENTAL', 'Verificador documental de contratistas', true)
ON CONFLICT ("codigo") DO UPDATE SET "nombre" = EXCLUDED."nombre", "activo" = true;

INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT gen_random_uuid(), catalogo.codigo, catalogo.descripcion, modulo.id
FROM "Modulo" AS modulo
CROSS JOIN (VALUES
  ('VERIFICADOR_DOCUMENTAL_LEER', 'Consultar historial y detalle de verificaciones documentales'),
  ('VERIFICADOR_DOCUMENTAL_CREAR', 'Crear borradores de verificación documental (requiere LEER)')
) AS catalogo(codigo, descripcion)
WHERE modulo."codigo" = 'VERIFICADOR_DOCUMENTAL'
ON CONFLICT ("codigo") DO UPDATE SET "descripcion" = EXCLUDED."descripcion", "moduloId" = EXCLUDED."moduloId";

-- Mismo acceso administrativo inicial que los demás módulos. Otros roles
-- reciben permisos únicamente cuando el administrador los asigna.
INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rol.id, permiso.id FROM "Rol" AS rol CROSS JOIN "Permiso" AS permiso
WHERE rol."nombre" = 'ADMINISTRADOR'
AND permiso."codigo" IN ('VERIFICADOR_DOCUMENTAL_LEER', 'VERIFICADOR_DOCUMENTAL_CREAR')
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
