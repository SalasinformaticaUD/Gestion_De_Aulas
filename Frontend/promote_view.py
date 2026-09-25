with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the media query wrapper, moving the rules to global
pattern = """@media (max-width: 850px) {
  .horarioDashboardGeneral .selectorDiaMovil {
    display: flex;
  }

  .horarioDashboardGeneral .desplazamientoHorario {
    overflow-x: hidden;
  }

  .horarioDashboardGeneral .cabeceraHorario,
  .horarioDashboardGeneral .cuerpoHorario {
    min-width: 0;
    grid-template-columns: 3.5rem 1fr;
  }

  .horarioDashboardGeneral .ocultoEnMovil {
    display: none !important;
  }
}"""
replacement = """
.horarioDashboardGeneral .selectorDiaMovil {
  display: flex;
}

.horarioDashboardGeneral .desplazamientoHorario {
  overflow-x: hidden;
}

.horarioDashboardGeneral .cabeceraHorario,
.horarioDashboardGeneral .cuerpoHorario {
  min-width: 0;
  grid-template-columns: 3.5rem 1fr;
}

.horarioDashboardGeneral .ocultoEnMovil {
  display: none !important;
}
"""

if pattern in css:
    css = css.replace(pattern, replacement)
else:
    print("Pattern not found. Using fallback replacement.")
    css = css.replace('@media (max-width: 850px) {\n  .horarioDashboardGeneral .selectorDiaMovil', '.horarioDashboardGeneral .selectorDiaMovil')
    css = css.replace('  .horarioDashboardGeneral .ocultoEnMovil {\n    display: none !important;\n  }\n}', '  .horarioDashboardGeneral .ocultoEnMovil {\n    display: none !important;\n  }\n')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Promoted mobile view to desktop!")
