# Informe 1 - Frontend

FECHA: 18/08/2026  
TURNO: 6:00 a. m. - 12:00 p. m.  
MONITOR: Carol Stefanya Velasco Rodriguez

## AVANCES

* Se revisó la estructura del prototipo y se creó la base del frontend en React con Next.js y TypeScript.
* Se organizó la app con rutas, componentes reutilizables, módulos y configuración general.
* Se desarrolló el shell principal con sidebar, topbar y diseño responsive.
* Se implementó la vista de Dashboard con indicadores básicos del sistema.
* Se implementó la vista de Horarios con filtros y tabla semanal por aula.


## FUNCIONA

* La app base de Next.js/React está funcionando.
* La navegación principal y el diseño general ya están definidos.
* Dashboard y horarios muestran la estructura inicial del sistema.
* El diseño es responsivo en la parte principal.

## NO FUNCIONA

* No están desarrollados todos los módulos del sistema.
* No hay consumo real de datos ni conexión con API.
* No hay autenticación ni lógica de negocio integrada.

## SIGUIENTE PASO

* Continuar con el desarrollo de la vista de Aulas y Calendario.
* Verificar que todas las vistas principales sean responsivas en móvil, tablet y escritorio.
* Definir y reutilizar componentes comunes para tablas, filtros, tarjetas y formularios.


## REVISIÓN LOCAL

Ejecutar desde la carpeta Frontend:

```bash
cd "C:\Users\MONITORES\Documents\Software Monitorias\Frontend"
npm install
npm run dev
```

Luego abrir:

- http://localhost:3000
- http://127.0.0.1:3000

> Importante: si ejecutas `npm run dev` desde la carpeta principal del proyecto o desde otra ruta, no va a funcionar porque esa carpeta no tiene el `package.json` del frontend.
