import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add numDias dynamic calculation right after `activos` is defined
pattern_activos = r'(const activos = useMemo\(\(\) => recurso\.datos\.filter\(\(horario\) => horario\.is_active && idsDependencia\.has\(horario\.monitor\)\), \[recurso\.datos, idsDependencia\]\);)'
replacement_activos = r'\1\n    const tieneSabado = useMemo(() => activos.some((horario) => horario.weekday === 5), [activos]);\n    const diasVisibles = tieneSabado ? 6 : 5;'

content = re.sub(pattern_activos, replacement_activos, content)

# Change dias.map and porDia logic to use dias.slice(0, diasVisibles)
content = content.replace('dias.map((dia, indice) =>', 'dias.slice(0, diasVisibles).map((dia, indice) =>')
content = content.replace('dias.map((_, indice) =>', 'dias.slice(0, diasVisibles).map((_, indice) =>')
content = content.replace('diaActual < dias.length', 'diaActual < diasVisibles')

# Change the CSS grid to use a CSS variable for the number of columns!
# Currently: className={estilos.desplazamientoHorario}
# Let's add style={{ "--columnas-calendario": diasVisibles }} as CSSProperties
content = content.replace(
    '<div className={estilos.desplazamientoHorario}>',
    '<div className={estilos.desplazamientoHorario} style={{ "--columnas-calendario": diasVisibles } as React.CSSProperties}>'
)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CalendarioHorariosDashboard for dynamic days!")
