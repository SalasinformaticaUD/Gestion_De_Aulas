import re
with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's add diaMovil state
pattern = r'const diaActual = \(ahora\.getDay\(\) \+ 6\) % 7;'
replacement = """const diaActual = (ahora.getDay() + 6) % 7;
  const [diaMovil, setDiaMovil] = useState(diaActual < dias.length ? diaActual : 0);"""
content = content.replace(pattern, replacement)

# Let's add the day selector just above desplazamientoHorario
pattern2 = r'(<div className=\{estilos\.desplazamientoHorario\})'
replacement2 = """<div className={estilos.selectorDiaMovil}>
          {dias.map((dia, indice) => (
            <button
              key={dia}
              type="button"
              className={diaMovil === indice ? estilos.diaMovilActivo : ""}
              onClick={() => setDiaMovil(indice)}
            >
              {dia}
            </button>
          ))}
        </div>
        $1"""
content = re.sub(pattern2, replacement2, content)

# Now apply CSS classes to headers and columns to hide them on mobile if they are not the active day
# First cabecera
pattern3 = r'(\{dias\.map\(\(dia, indice\) => <strong key=\{dia\} className=\{diaActual === indice \? estilos\.diaHorarioActual : undefined\})'
replacement3 = r'{dias.map((dia, indice) => <strong key={dia} className={`${diaActual === indice ? estilos.diaHorarioActual : ""} ${diaMovil !== indice ? estilos.ocultoEnMovil : ""}`}'
content = re.sub(pattern3, replacement3, content)

# Next columna
pattern4 = r'(\{dias\.map\(\(dia, indice\) => <div key=\{dia\} className=\{\`\$\{estilos\.columnaDiaHorario\} \$\{diaActual === indice \? estilos\.columnaDiaActual : ""\}\`\})'
replacement4 = r'{dias.map((dia, indice) => <div key={dia} className={`${estilos.columnaDiaHorario} ${diaActual === indice ? estilos.columnaDiaActual : ""} ${diaMovil !== indice ? estilos.ocultoEnMovil : ""}`}'
content = re.sub(pattern4, replacement4, content)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CalendarioHorariosDashboard.tsx")
