import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/RevisionHorasExtra.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('router.push(/gestion-monitores/registros/?fecha=)', 'router.push(/gestion-monitores/registros/?fecha=)')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/RevisionHorasExtra.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed purely!')
