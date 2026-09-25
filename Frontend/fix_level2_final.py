import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Match the entire Nivel 2 div exactly
pattern = r'<div className=\{estilos\.nivelGrafica\}><strong>Nivel 2: Clasificacin de horas</strong>.*?</div></div>'

new_nivel2 = '''<div className={estilos.nivelGrafica}><strong>Nivel 2: Clasificación de horas</strong><div className={estilos.leyendaTiempo}><span className={estilos.normal}>Horas normales</span><span className={estilos.extraPendiente}>Extra pendiente</span><span className={estilos.extraAprobada}>Extra aprobada</span><span className={estilos.extraRechazada}>Extra rechazada</span><span className={estilos.sinAplica}>No aplica extra</span><span className={estilos.errorTiempo}>Error</span></div><div className={estilos.pistaTiempo}>
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
        </div></div>'''

# We have an encoding issue with "Clasificacin" in the terminal output, let's just match "Nivel 2:" and "</div></div>"
pattern = r'<div className=\{estilos\.nivelGrafica\}><strong>Nivel 2:.*?</div></div>'
content = re.sub(pattern, new_nivel2, content, flags=re.DOTALL)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced level 2 properly!')
