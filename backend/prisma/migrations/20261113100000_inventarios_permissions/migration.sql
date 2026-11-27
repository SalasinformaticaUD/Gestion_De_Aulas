INSERT INTO "Modulo" ("id", "codigo", "nombre", "activo")
VALUES (gen_random_uuid(), 'INVENTARIOS', 'Inventarios', true)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT gen_random_uuid(), catalogo.codigo, catalogo.descripcion, modulo.id
FROM "Modulo" AS modulo
CROSS JOIN (
  VALUES
    ('INVENTARIO_CONSULTAR', 'Consultar inventario'),
    ('ELEMENTO_CREAR', 'Crear elementos'),
    ('ELEMENTO_EDITAR', 'Editar elementos'),
    ('INVENTARIO_VERIFICAR', 'Verificar inventario'),
    ('MOVIMIENTO_INICIAR', 'Iniciar movimientos'),
    ('MOVIMIENTO_CONFIRMAR', 'Confirmar movimientos'),
    ('MOVIMIENTO_RESOLVER', 'Resolver novedades de movimiento'),
    ('INVENTARIO_PROFESOR_GESTIONAR', 'Gestionar inventarios de profesor'),
    ('DOCUMENTO_LAI_GENERAR', 'Generar listados de activos'),
    ('DOCUMENTO_HOJA_VIDA_GENERAR', 'Generar hojas de vida'),
    ('DOCUMENTO_TRASPASO_GENERAR', 'Generar traspasos'),
    ('DOCUMENTO_BAJA_GENERAR', 'Generar documentos de baja'),
    ('TRASPASO_APLICAR', 'Aplicar traspasos firmados'),
    ('BAJA_APLICAR', 'Aplicar bajas'),
    ('BODEGA_CONSULTAR', 'Consultar bodega'),
    ('BODEGA_INGRESAR', 'Ingresar existencias de bodega'),
    ('BODEGA_ENTREGAR', 'Entregar existencias de bodega'),
    ('BODEGA_AJUSTAR', 'Ajustar existencias de bodega'),
    ('AUDITORIA_CONSULTAR', 'Consultar auditoría'),
    ('PERMISOS_ADMINISTRAR', 'Administrar permisos')
) AS catalogo(codigo, descripcion)
WHERE modulo."codigo" = 'INVENTARIOS'
ON CONFLICT ("codigo") DO NOTHING;
