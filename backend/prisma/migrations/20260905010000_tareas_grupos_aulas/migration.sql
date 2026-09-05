-- Agrupa tareas creadas para varias aulas, conservando un registro y avance por aula.
ALTER TABLE "Tarea" ADD COLUMN "grupoId" UUID;

CREATE INDEX "Tarea_grupoId_creadoEn_idx" ON "Tarea"("grupoId", "creadoEn");
