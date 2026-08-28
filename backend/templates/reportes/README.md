# Plantillas de reportes

Estas son las plantillas institucionales vigentes para la generación de PDF:

- `Ficha - Practicas libres.xlsx`: ficha de práctica libre.
- `Ficha SIGUD audiovisuales.xlsx`: préstamo de equipos audiovisuales.
- `SIGUD.xlsx`: asistencia docente.

Las plantillas deben conservarse en formato XLSX porque el renderizador rellena
las celdas y luego utiliza LibreOffice para exportarlas a PDF. Las imágenes y
el diseño se conservan dentro del libro original.

No se deben guardar aquí PDFs generados, archivos temporales ni copias de
prueba. La ruta de cada archivo está centralizada en
`src/reportes/plantillas-pdf.service.ts`.
