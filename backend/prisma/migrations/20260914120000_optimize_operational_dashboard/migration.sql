CREATE INDEX "PracticaLibre_estado_inicio_idx"
  ON "PracticaLibre"("estado", "inicio");

CREATE INDEX "PrestamoDocente_estado_inicio_fin_idx"
  ON "PrestamoDocente"("estado", "inicio", "fin");

CREATE INDEX "Observacion_creadoEn_idx"
  ON "Observacion"("creadoEn");

CREATE INDEX "Tarea_estado_prioridad_creadoEn_idx"
  ON "Tarea"("estado", "prioridad", "creadoEn");
