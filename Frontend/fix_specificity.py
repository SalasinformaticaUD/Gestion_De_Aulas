with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace(
"""
.vistaDiaria .cabeceraHorario,
.vistaDiaria .cuerpoHorario {
  min-width: 0;
  grid-template-columns: 3.5rem 1fr;
}
""",
"""
.vistaDiaria .cabeceraHorario,
.vistaDiaria .cuerpoHorario {
  min-width: 0 !important;
  grid-template-columns: 3.5rem 1fr !important;
}
""")

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Added !important to vistaDiaria")
