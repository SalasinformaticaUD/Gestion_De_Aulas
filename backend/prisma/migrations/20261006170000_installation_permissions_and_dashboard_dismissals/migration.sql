-- El catálogo de Solicitudes de instalación debe existir sin depender de
-- ejecutar el seed de datos de desarrollo en producción.
INSERT INTO "Modulo" ("id", "codigo", "nombre", "activo")
VALUES (gen_random_uuid(), 'SOLICITUDES_INSTALACION', 'Solicitudes de instalación', true)
ON CONFLICT ("codigo") DO UPDATE
SET "nombre" = EXCLUDED."nombre", "activo" = true;

INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT gen_random_uuid(), catalogo.codigo, catalogo.descripcion, modulo.id
FROM "Modulo" AS modulo
CROSS JOIN (
  VALUES
    ('SOLICITUDES_INSTALACION_LEER', 'LEER en Solicitudes de instalación'),
    ('SOLICITUDES_INSTALACION_IMPORTAR', 'IMPORTAR en Solicitudes de instalación'),
    ('SOLICITUDES_INSTALACION_ACTUALIZAR', 'ACTUALIZAR en Solicitudes de instalación'),
    ('SOLICITUDES_INSTALACION_APROBAR', 'APROBAR en Solicitudes de instalación'),
    ('SOLICITUDES_INSTALACION_RECHAZAR', 'RECHAZAR en Solicitudes de instalación'),
    ('SOLICITUDES_INSTALACION_EXPORTAR', 'EXPORTAR en Solicitudes de instalación')
) AS catalogo(codigo, descripcion)
WHERE modulo."codigo" = 'SOLICITUDES_INSTALACION'
ON CONFLICT ("codigo") DO UPDATE
SET "descripcion" = EXCLUDED."descripcion", "moduloId" = EXCLUDED."moduloId";

-- El administrador conserva acceso total. Los demás cargos pueden recibir
-- estos permisos desde Administración > Usuarios.
INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rol.id, permiso.id
FROM "Rol" AS rol
CROSS JOIN "Permiso" AS permiso
WHERE rol."nombre" = 'ADMINISTRADOR'
  AND permiso."codigo" LIKE 'SOLICITUDES_INSTALACION_%'
ON CONFLICT ("rolId", "permisoId") DO NOTHING;

-- Las notificaciones calculadas se descartan por usuario, fecha y bloque.
CREATE TABLE "NotificacionPanelDescartada" (
  "id" UUID NOT NULL,
  "usuarioId" UUID NOT NULL,
  "alertaId" VARCHAR(200) NOT NULL,
  "fecha" VARCHAR(10) NOT NULL,
  "horaInicio" VARCHAR(5) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificacionPanelDescartada_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificacionPanelDescartada_usuarioId_alertaId_fecha_horaInicio_key"
ON "NotificacionPanelDescartada"("usuarioId", "alertaId", "fecha", "horaInicio");

CREATE INDEX "NotificacionPanelDescartada_usuarioId_fecha_horaInicio_idx"
ON "NotificacionPanelDescartada"("usuarioId", "fecha", "horaInicio");

ALTER TABLE "NotificacionPanelDescartada"
ADD CONSTRAINT "NotificacionPanelDescartada_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
