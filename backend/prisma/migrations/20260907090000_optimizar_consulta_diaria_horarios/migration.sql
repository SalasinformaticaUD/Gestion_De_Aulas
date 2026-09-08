-- Cubre la consulta diaria: período seleccionado, día de semana y orden por hora.
CREATE INDEX "ClaseProgramada_periodoId_diaSemana_horaInicio_idx"
  ON "ClaseProgramada"("periodoId", "diaSemana", "horaInicio");
