-- Conserva el grupo de participantes de cada aceptación y cada informe.
ALTER TABLE "DecisionTareaOperativa" ADD COLUMN "participantes" JSONB;
ALTER TABLE "InformeSeguimientoTarea" ADD COLUMN "responsables" JSONB;

UPDATE "DecisionTareaOperativa" AS decision
SET "participantes" = jsonb_build_array(
  jsonb_build_object('id', usuario."id", 'nombreCompleto', usuario."nombreCompleto")
)
FROM "Usuario" AS usuario
WHERE usuario."id" = decision."usuarioId";

UPDATE "InformeSeguimientoTarea" AS informe
SET "responsables" = jsonb_build_array(
  jsonb_build_object('id', usuario."id", 'nombreCompleto', usuario."nombreCompleto")
)
FROM "Usuario" AS usuario
WHERE usuario."id" = informe."autorId";
