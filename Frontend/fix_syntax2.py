import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's just fix the tramos block completely using regex since it's messed up
new_tramos = """const tramos = [
              <i key={`${registro.id}-normal`} className={estilos.tramoNormal} style={estiloTramo(inicio, Math.max(inicio, salida - extraMinutos))} />
            ];
            if (extraMinutos > 0) {
              tramos.push(<i key={`${registro.id}-extra`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(Math.max(inicio, salida - extraMinutos), salida)} />);
            }"""

content = re.sub(r'const tramos = \[.*?\];\s*if \(extraMinutos > 0\) \{.*?\}', new_tramos, content, flags=re.DOTALL)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed syntax cleanly!')
