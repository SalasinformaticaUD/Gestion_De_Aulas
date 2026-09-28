import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add logic to clear selection when diaMovil changes
# We can do this in useEffect, or simply by updating the click handlers of the day selector.
# The click handlers are:
# onClick={() => setDiaMovil(-1)}
# onClick={() => setDiaMovil(indice)}

content = content.replace('onClick={() => setDiaMovil(-1)}', 'onClick={() => { setDiaMovil(-1); }}')
content = content.replace('onClick={() => setDiaMovil(indice)}', 'onClick={() => { setDiaMovil(indice); limpiarSeleccion(); }}')

# Modify seleccionarBloque to ignore clicks in single-day mode
old_sel = """const seleccionarBloque = (horario: HorarioApi) => {
    if (bloqueSeleccionado?.id === horario.id) {"""
new_sel = """const seleccionarBloque = (horario: HorarioApi) => {
    if (diaMovil !== -1) return;
    if (bloqueSeleccionado?.id === horario.id) {"""
content = content.replace(old_sel, new_sel)

# To give visual feedback that they are not clickable, we can add a conditional class or just modify CSS
# But actually, just adding `style={{ cursor: diaMovil !== -1 ? 'default' : 'pointer', ... }}` is easiest.
content = content.replace(
    'style={style}',
    'style={{ ...style, cursor: diaMovil !== -1 ? "default" : "pointer" }}'
)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated click behavior for daily mode!")
