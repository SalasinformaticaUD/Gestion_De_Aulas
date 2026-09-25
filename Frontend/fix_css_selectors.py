import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

# I will also add .ocultoEnMovil {} outside the media query just to be 100% sure Next.js maps it
css = css.replace('.selectorDiaMovil {', '.ocultoEnMovil {}\n.horarioDashboardGeneral {}\n.selectorDiaMovil {')

css = css.replace('.horarioDashboard:not(.horarioDashboardPersonal)', '.horarioDashboardGeneral')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    tsx = f.read()

tsx = tsx.replace(
    'className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : ""}`}',
    'className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : estilos.horarioDashboardGeneral}`}'
)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(tsx)

print("Fixed CSS Modules selectors")
