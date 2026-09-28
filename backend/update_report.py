import re
with open("C:/Users/ACER/Documents/Software Monitorias/backend/Informes/Plataforma e integracion/Informe 42 BackPlateInt.md", "r", encoding="utf-8") as f:
    content = f.read()

# Add to OBJETIVO DE LA JORNADA
objetivo_pattern = r'y solventar los pendientes técnicos heredados del Informe 41 referentes a la invalidación automática de sesiones\.'
content = re.sub(objetivo_pattern, 'solventar los pendientes técnicos heredados del Informe 41 referentes a la invalidación automática de sesiones, y adaptar la vista del horario en el Dashboard para su correcta navegación en dispositivos móviles.', content)

# Add to ALCANCE Y REGLA DE TRABAJO
alcance_pattern = r'La invalidación de una marcación que ya tiene una sesión debe resolver la sesión derivada automáticamente sin exigir pasos extra al usuario en otras pantallas\.'
content = re.sub(alcance_pattern, 'La invalidación de una marcación que ya tiene una sesión debe resolver la sesión derivada automáticamente sin exigir pasos extra al usuario en otras pantallas.\n* La vista del calendario del Dashboard en móvil debe presentarse en un formato de columna única (sin scroll horizontal) permitiendo seleccionar el día mediante botones.', content)

# Add new subsection in TRABAJO REALIZADO
new_subsection = """### Optimización móvil del Calendario Dashboard
* En `CalendarioHorariosDashboard.tsx` se integró un nuevo selector de días (Lunes a Sábado) que permite al usuario móvil elegir qué día específico desea visualizar.
* Se agregó la lógica para que por defecto el sistema auto-seleccione el día actual de la semana (si es un día hábil).
* En `SistemaVisualMonitores.module.css` se introdujo un media query (`max-width: 850px`) que reescribe la cuadrícula CSS (`grid-template-columns`). Esto permite ocultar dinámicamente las columnas de los días inactivos y expandir la columna del día seleccionado al 100% del contenedor, erradicando la necesidad de scroll horizontal.

## VALIDACIÓN TÉCNICA"""
content = content.replace('## VALIDACIÓN TÉCNICA', new_subsection)

with open("C:/Users/ACER/Documents/Software Monitorias/backend/Informes/Plataforma e integracion/Informe 42 BackPlateInt.md", "w", encoding="utf-8") as f:
    f.write(content)

print("Report updated.")
