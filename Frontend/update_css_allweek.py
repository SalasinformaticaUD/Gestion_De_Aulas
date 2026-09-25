with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'r', encoding='utf-8') as f:
    css = f.read()

# I will add .vistaDiaria {} to make sure Next.js maps it
css = css.replace('.ocultoEnMovil {}', '.ocultoEnMovil {}\n.vistaDiaria {}')

css = css.replace('.horarioDashboardGeneral .desplazamientoHorario', '.vistaDiaria .desplazamientoHorario')
css = css.replace('.horarioDashboardGeneral .cabeceraHorario,\n.horarioDashboardGeneral .cuerpoHorario', '.vistaDiaria .cabeceraHorario,\n.vistaDiaria .cuerpoHorario')
css = css.replace('.horarioDashboardGeneral .ocultoEnMovil', '.vistaDiaria .ocultoEnMovil')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/SistemaVisualMonitores.module.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated for vistaDiaria!")
