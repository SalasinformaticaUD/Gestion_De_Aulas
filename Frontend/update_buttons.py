import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace("""
.selectorDiaMovil {
  display: none;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  overflow-x: auto;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.selectorDiaMovil button {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}""", """
.selectorDiaMovil {
  display: none;
  gap: 0.2rem;
  padding: 0.4rem 0.5rem;
  overflow-x: auto;
  border-top: 1px solid var(--line);
  background: var(--surface);
  justify-content: space-evenly;
}

.selectorDiaMovil button {
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  flex: 1;
}""")

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS Buttons updated!")
