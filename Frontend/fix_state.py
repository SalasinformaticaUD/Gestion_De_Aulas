import re
with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const diaActual = (ahora.getDay() + 6) % 7;',
    'const diaActual = (ahora.getDay() + 6) % 7;\n  const [diaMovil, setDiaMovil] = useState(diaActual < dias.length ? diaActual : 0);'
)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/panel/CalendarioHorariosDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("State added!")
