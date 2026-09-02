CREATE TABLE "CredencialRol" (
    "credencialId" UUID NOT NULL,
    "rolId" UUID NOT NULL,
    CONSTRAINT "CredencialRol_pkey" PRIMARY KEY ("credencialId", "rolId")
);
ALTER TABLE "CredencialRol" ADD CONSTRAINT "CredencialRol_credencialId_fkey" FOREIGN KEY ("credencialId") REFERENCES "CredencialOperativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CredencialRol" ADD CONSTRAINT "CredencialRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
