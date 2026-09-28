import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to replace the Nivel 2 logic.
old_nivel2 = r'<div className=\{estilos\.pistaTiempo\}>\{primerInicio !== undefined && ultimaSalida !== undefined && <i className=\{estilos\.tramoNormal\} style=\{estiloTramo\(primerInicio, ultimaSalida\)\} />\}\{extra && ultimaSalida !== undefined && <i className=\{\$\{estilos\.tramoExtra\} \$\{claseExtra\}\} style=\{estiloTramo\(ultimaSalida - extra\.horasExtra \* 60, ultimaSalida\)\} />\}</div>'

new_nivel2 = '''<div className={estilos.pistaTiempo}>
          {registros.flatMap((registro) => {
            const inicio = minutos(registro.entrada);
            const salida = minutos(registro.salida);
            if (inicio === null || salida === null) return [];
            const extraMinutos = registro.horasExtra * 60;
            const claseExtra = registro.estadoExtra === "APROBADA" ? estilos.extraAprobada : registro.estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
            const tramos = [
              <i key={${registro.id}-normal} className={estilos.tramoNormal} style={estiloTramo(inicio, salida - extraMinutos)} />
            ];
            if (extraMinutos > 0) {
              tramos.push(<i key={${registro.id}-extra} className={${estilos.tramoExtra} } style={estiloTramo(salida - extraMinutos, salida)} />);
            }
            return tramos;
          })}
        </div>'''

content = re.sub(old_nivel2, new_nivel2, content)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed level 2 logic!')
