import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\s*const primerInicio = .*?;', '', content)
content = re.sub(r'\s*const ultimaSalida = .*?;', '', content)
content = re.sub(r'\s*const extra = .*?;', '', content)
content = re.sub(r'\s*const claseExtra = .*?;', '', content)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleaned up unused variables!')
