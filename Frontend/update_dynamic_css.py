import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace repeat(6, ...) with repeat(var(--columnas-calendario, 6), ...)
# Be careful to only change it for cabeceraHorario and cuerpoHorario of the dashboard.

css = css.replace('grid-template-columns: 3.8rem repeat(6, minmax(125px, 1fr));', 'grid-template-columns: 3.8rem repeat(var(--columnas-calendario, 6), minmax(125px, 1fr));')
css = css.replace('grid-template-columns: 3.5rem repeat(6, minmax(115px, 1fr));', 'grid-template-columns: 3.5rem repeat(var(--columnas-calendario, 6), minmax(115px, 1fr));')
css = css.replace('grid-template-columns: clamp(2.25rem, 12vw, 3rem) repeat(6, minmax(0, 1fr));', 'grid-template-columns: clamp(2.25rem, 12vw, 3rem) repeat(var(--columnas-calendario, 6), minmax(0, 1fr));')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS updated for dynamic columns!")
