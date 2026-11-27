-- Los PDF se conservan en PostgreSQL para que el archivo y su historial sean atómicos.
ALTER TABLE "ArchivoVerificacionDocumental" ADD COLUMN "contenido" BYTEA;
