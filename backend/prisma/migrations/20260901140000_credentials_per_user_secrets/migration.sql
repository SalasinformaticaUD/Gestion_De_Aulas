ALTER TABLE "CredencialOperativa" DROP COLUMN "categoria";
ALTER TABLE "CredencialOperativa" ALTER COLUMN "secretoCifrado" DROP NOT NULL;

CREATE TABLE "SecretoCredencial" (
    "id" UUID NOT NULL,
    "credencialId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "secretoCifrado" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecretoCredencial_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SecretoCredencial_credencialId_usuarioId_key" ON "SecretoCredencial"("credencialId", "usuarioId");
CREATE INDEX "SecretoCredencial_usuarioId_idx" ON "SecretoCredencial"("usuarioId");
ALTER TABLE "SecretoCredencial" ADD CONSTRAINT "SecretoCredencial_credencialId_fkey" FOREIGN KEY ("credencialId") REFERENCES "CredencialOperativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretoCredencial" ADD CONSTRAINT "SecretoCredencial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
