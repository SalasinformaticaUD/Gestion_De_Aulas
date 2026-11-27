-- Conserva historial, evidencias de los resultados y procedencia (archivo/página).
-- Elimina los originales y el texto documental completo guardados anteriormente.
ALTER TABLE "ArchivoVerificacionDocumental"
  DROP COLUMN IF EXISTS "contenido",
  DROP COLUMN IF EXISTS "claveAlmacenamiento";
ALTER TABLE "DocumentoVerificacionDocumental"
  DROP COLUMN IF EXISTS "textoExtraido",
  DROP COLUMN IF EXISTS "camposExtraidos";
