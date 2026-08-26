-- Registra el funcionario que dejó constancia de cada limpieza y permite
-- consultar el historial de forma eficiente por aula, fecha y responsable.
ALTER TABLE "Limpieza" ADD COLUMN "responsableId" UUID;

CREATE INDEX "Limpieza_aulaId_realizadaEn_idx" ON "Limpieza"("aulaId", "realizadaEn");
CREATE INDEX "Limpieza_realizadaEn_idx" ON "Limpieza"("realizadaEn");
CREATE INDEX "Limpieza_responsableId_idx" ON "Limpieza"("responsableId");

ALTER TABLE "Limpieza"
  ADD CONSTRAINT "Limpieza_responsableId_fkey"
  FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
