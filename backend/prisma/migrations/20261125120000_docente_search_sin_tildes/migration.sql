CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Immutable normalization lets the indexes serve partial, accent-free searches.
CREATE FUNCTION public.normalizar_busqueda_docente(texto text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT regexp_replace(normalize(lower(texto), NFD), U&'[\0300-\036f]', '', 'g')
$$;

CREATE INDEX "Docente_nombre_busqueda_trgm_idx" ON "Docente"
USING gin (public.normalizar_busqueda_docente("nombre") gin_trgm_ops);
CREATE INDEX "Docente_documento_busqueda_trgm_idx" ON "Docente"
USING gin (public.normalizar_busqueda_docente("documento") gin_trgm_ops);
CREATE INDEX "Docente_correo_busqueda_trgm_idx" ON "Docente"
USING gin (public.normalizar_busqueda_docente("correo") gin_trgm_ops);
CREATE INDEX "Docente_proyecto_busqueda_trgm_idx" ON "Docente"
USING gin (public.normalizar_busqueda_docente("proyecto") gin_trgm_ops);
