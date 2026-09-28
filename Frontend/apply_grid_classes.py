with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

new_css = """
.rejillaDias6 .cabeceraHorario,
.rejillaDias6 .cuerpoHorario {
  grid-template-columns: 3.8rem repeat(6, minmax(125px, 1fr));
}
.rejillaDias5 .cabeceraHorario,
.rejillaDias5 .cuerpoHorario {
  grid-template-columns: 3.8rem repeat(5, minmax(125px, 1fr));
}

@media (max-width: 1120px) {
  .rejillaDias6 .cabeceraHorario,
  .rejillaDias6 .cuerpoHorario {
    grid-template-columns: 3.5rem repeat(6, minmax(115px, 1fr));
  }
  .rejillaDias5 .cabeceraHorario,
  .rejillaDias5 .cuerpoHorario {
    grid-template-columns: 3.5rem repeat(5, minmax(115px, 1fr));
  }
}

.horarioDashboardPersonal.rejillaDias6 .cabeceraHorario,
.horarioDashboardPersonal.rejillaDias6 .cuerpoHorario {
  grid-template-columns: clamp(2.25rem, 12vw, 3rem) repeat(6, minmax(0, 1fr));
}
.horarioDashboardPersonal.rejillaDias5 .cabeceraHorario,
.horarioDashboardPersonal.rejillaDias5 .cuerpoHorario {
  grid-template-columns: clamp(2.25rem, 12vw, 3rem) repeat(5, minmax(0, 1fr));
}
"""

css += new_css
with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)

import re
with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    tsx = f.read()

# I will add the rejillaDiasX class to the main section wrapper instead of desplazamientoHorario
tsx = tsx.replace(
    'className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : estilos.horarioDashboardGeneral} ${diaMovil !== -1 ? estilos.vistaDiaria : ""}`}',
    'className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : estilos.horarioDashboardGeneral} ${diaMovil !== -1 ? estilos.vistaDiaria : ""} ${diasVisibles === 5 ? estilos.rejillaDias5 : estilos.rejillaDias6}`}'
)

# Remove the --columnas-calendario style hack
tsx = re.sub(r'style=\{\{ "--columnas-calendario": diasVisibles \} as React\.CSSProperties\}', '', tsx)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(tsx)

print("Added rejillaDias class logic!")
