import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change state initialization to include -1 for "all week" if on desktop?
# Actually, let's just make it default to diaActual. But they can click "Semana".
# Wait, let's keep diaActual as default, but add a button for -1.

pattern_selector = r'(<div className=\{estilos\.selectorDiaMovil\}>)'
replacement_selector = """<div className={estilos.selectorDiaMovil}>
          <button
            type="button"
            className={diaMovil === -1 ? estilos.diaMovilActivo : ""}
            onClick={() => setDiaMovil(-1)}
          >
            Semana
          </button>"""
content = re.sub(pattern_selector, replacement_selector, content)

# Change the condition for ocultoEnMovil from `diaMovil !== indice` to `diaMovil !== -1 && diaMovil !== indice`
content = content.replace('diaMovil !== indice ? estilos.ocultoEnMovil : ""', 'diaMovil !== -1 && diaMovil !== indice ? estilos.ocultoEnMovil : ""')

# Add vistaDiaria class to the wrapper
content = content.replace(
    'className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : estilos.horarioDashboardGeneral}`}',
    'className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : estilos.horarioDashboardGeneral} ${diaMovil !== -1 ? estilos.vistaDiaria : ""}`}'
)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("JSX updated for all-week view!")
