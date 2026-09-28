import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('key={-normal}', 'key={\-normal}')
content = content.replace('key={-extra}', 'key={\-extra}')
content = content.replace('className={ }', 'className={${estilos.tramoExtra} }')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed syntax!')
