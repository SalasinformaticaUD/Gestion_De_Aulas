-- Extiende tareas operativas con la decisión del responsable, seguimiento y trazabilidad.
ALTER TYPE "EstadoTarea" ADD VALUE IF NOT EXISTS 'SUSPENDIDA';
ALTER TYPE "EstadoTarea" ADD VALUE IF NOT EXISTS 'RECHAZADA';

CREATE TYPE "PrioridadTarea" AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAJA');
CREATE TYPE "DecisionTarea" AS ENUM ('ACEPTADA', 'RECHAZADA');

ALTER TABLE "Tarea"
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'OTRA',
  ADD COLUMN "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'MEDIA',
  ADD COLUMN "observaciones" TEXT,
  ADD COLUMN "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "DecisionTareaOperativa" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tareaId" UUID NOT NULL,
  "usuarioId" UUID NOT NULL,
  "decision" "DecisionTarea" NOT NULL,
  "tomadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DecisionTareaOperativa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InformeSeguimientoTarea" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tareaId" UUID NOT NULL,
  "autorId" UUID NOT NULL,
  "actividadesRealizadas" TEXT NOT NULL,
  "accionesPendientes" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InformeSeguimientoTarea_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Tarea_aulaId_inicio_fin_idx" ON "Tarea"("aulaId", "inicio", "fin");
CREATE INDEX "Tarea_responsableId_estado_idx" ON "Tarea"("responsableId", "estado");
CREATE INDEX "DecisionTareaOperativa_tareaId_tomadaEn_idx" ON "DecisionTareaOperativa"("tareaId", "tomadaEn");
CREATE INDEX "InformeSeguimientoTarea_tareaId_creadoEn_idx" ON "InformeSeguimientoTarea"("tareaId", "creadoEn");

ALTER TABLE "DecisionTareaOperativa" ADD CONSTRAINT "DecisionTareaOperativa_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DecisionTareaOperativa" ADD CONSTRAINT "DecisionTareaOperativa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InformeSeguimientoTarea" ADD CONSTRAINT "InformeSeguimientoTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InformeSeguimientoTarea" ADD CONSTRAINT "InformeSeguimientoTarea_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
