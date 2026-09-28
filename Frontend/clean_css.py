with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

# I need to clean up the bottom of the file
lines = css.splitlines()
# Find where .ocultoEnMovil {} first appears
idx = 0
for i, l in enumerate(lines):
    if l.startswith('.ocultoEnMovil {}'):
        idx = i
        break

css_clean = '\n'.join(lines[:idx])

# Now append cleanly
css_clean += """
.ocultoEnMovil {}
.horarioDashboardGeneral {}

.selectorDiaMovil {
  display: none;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  overflow-x: auto;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.selectorDiaMovil button {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.selectorDiaMovil button.diaMovilActivo {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

@media (max-width: 850px) {
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
}
"""

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css_clean)
print("CSS cleaned and fixed!")
