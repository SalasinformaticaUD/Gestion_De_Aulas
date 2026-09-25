import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace grid-template-columns: repeat(3, minmax(0, 1fr)); with 2 columns
css = css.replace(
""".rejillaSeguimiento {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}""",
""".rejillaSeguimiento {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}""")

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated columns!")
