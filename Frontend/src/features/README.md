# Módulos funcionales

Cada carpeta tendrá esta división cuando se implemente el módulo:

```text
nombre-del-modulo/
├─ api/          # funciones que consumen la API del dominio
├─ components/   # componentes exclusivos del módulo
├─ hooks/        # estado y consultas propios del módulo
├─ types/        # tipos exclusivos del módulo
└─ utils/        # transformaciones o validaciones locales
```

Los componentes reutilizables pertenecen a `src/components`, no a estas carpetas.
