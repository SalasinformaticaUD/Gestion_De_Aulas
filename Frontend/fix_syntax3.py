import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's completely replace the map function content.
pattern = r'registros\.flatMap\(\(registro\) => \{.*?return tramos;\s*\}\)'

new_map = """registros.flatMap((registro) => {
            const inicio = minutos(registro.entrada);
            const salida = minutos(registro.salida);
            if (inicio === null || salida === null) return [];
            const extraMinutos = registro.horasExtra * 60;
            const claseExtra = registro.estadoExtra === "APROBADA" ? estilos.extraAprobada : registro.estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
            const tramos = [
              <i key={`${registro.id}-normal`} className={estilos.tramoNormal} style={estiloTramo(inicio, Math.max(inicio, salida - extraMinutos))} />
            ];
            if (extraMinutos > 0) {
              tramos.push(<i key={`${registro.id}-extra`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(Math.max(inicio, salida - extraMinutos), salida)} />);
            }
            return tramos;
          })"""

content = re.sub(pattern, new_map, content, flags=re.DOTALL)
# there is a leftover piece from my previous attempt:
content = re.sub(r'-extra\} className=\{.*?\)\);\s*\}', '', content, flags=re.DOTALL)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed completely!')
