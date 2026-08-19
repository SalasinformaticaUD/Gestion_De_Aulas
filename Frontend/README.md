# Frontend - Sistema de Gestión Operativa

Frontend común construido con Next.js, React y TypeScript. La estructura toma como referencia el prototipo de Figma Make: una barra lateral, una barra superior y módulos operativos independientes.

## Organización

- `src/app`: rutas, layouts y estilos globales de Next.js.
- `src/features`: cada módulo del sistema con sus componentes, tipos y cliente de API.
- `src/components`: componentes visuales reutilizables, incluidos los elementos del shell del prototipo.
- `src/services`: clientes HTTP de cada API; no contiene lógica visual.
- `src/config`: navegación y configuración transversal.
- `src/types`: contratos compartidos entre módulos.

Los módulos de Monitores consumirán la API de Monitores. Los demás consumirán la API de Gestión de Aulas; el frontend no accede directamente a ninguna base de datos.
