import re

# Remove the var() from CSS
with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('grid-template-columns: 3.8rem repeat(var(--columnas-calendario, 6), minmax(125px, 1fr));', '')
css = css.replace('grid-template-columns: 3.5rem repeat(var(--columnas-calendario, 6), minmax(115px, 1fr));', '')
css = css.replace('grid-template-columns: clamp(2.25rem, 12vw, 3rem) repeat(var(--columnas-calendario, 6), minmax(0, 1fr));', '')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)

# Add inline style for grid-template-columns
with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    tsx = f.read()

# I need to apply style to cabeceraHorario and cuerpoHorario
# <div className={estilos.cabeceraHorario}>
# -> <div className={estilos.cabeceraHorario} style={{ gridTemplateColumns: `clamp(2.25rem, 12vw, 3.8rem) repeat(${diasVisibles}, minmax(0, 1fr))` }}>

# Since the CSS had different values for media queries (3.8rem 125px vs 3.5rem 115px vs clamp), the easiest way is to use a CSS variable for the *entire* grid-template-columns property, or inject a class!
# Or we can just use CSS variable for the column widths, no wait.
# The simplest fix is to NOT use repeat(). We can use `minmax(0, 1fr) minmax(0, 1fr)...`
# Since it's only 5 or 6, we can write a CSS variable `--grilla-dias` which we define in React:
# `const grillaDias = Array(diasVisibles).fill("minmax(125px, 1fr)").join(" ");`
# But responsive values change!

# Let's restore the CSS to have two classes: .cuerpoHorario5 and .cuerpoHorario6 !
