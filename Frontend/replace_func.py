import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """function LineaTiempoDia({ fecha, registros, horarios }: { fecha: string; registros: SesionMonitor[]; horarios: HorarioMonitor[] }) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const horario = horarios.find((item) => item.activo && item.dia === dias[diaSemana(fecha)]);
  const inicioAsignado = horario ? minutos(horario.horaInicio) : null;
  const finAsignado = horario ? minutos(horario.horaFin) : null;
  const horasTrabajadas = registros.reduce((total, item) => total + item.horasNormales + (item.estadoExtra === "APROBADA" ? item.horasExtra : 0), 0);
  const marcaciones = registros.flatMap((registro) => [[minutos(registro.entrada), "entrada", registro.id, registro.estadoExtra], [minutos(registro.salida), "salida", `${registro.id}-salida`, registro.estadoExtra]] as const).filter(([valor]) => valor !== null);

  return <section className={estilos.lineaTiempoRegistro} aria-label={`Línea de tiempo del ${fecha}`}>
    <div className={estilos.cabeceraLineaTiempo}><div><strong>Visualización de jornada</strong><span>{horario ? `Horario asignado: ${horario.horaInicio} – ${horario.horaFin}` : "Sin horario asignado para este día"}</span></div><span className={estilos.insignia}>{horasTrabajadas.toFixed(1)} h trabajadas</span></div>
    <p className={estilos.ayudaDesplazamientoLinea}>Deslice horizontalmente para consultar toda la jornada.</p>
    <div className={estilos.desplazamientoLineaTiempo} tabIndex={0} aria-label="Línea de tiempo desplazable horizontalmente">
      <div className={estilos.contenidoLineaTiempo}>
        <div className={estilos.escalaGrafica} aria-hidden="true">{horasEscala.map((hora) => <span key={hora} style={{ left: `${porcentaje(hora)}%` }} />)}</div>
        <div className={estilos.nivelGrafica}><strong>Nivel 1: Horario asignado</strong><div className={estilos.pistaTiempo}>{inicioAsignado !== null && finAsignado !== null ? <i className={estilos.tramoAsignado} style={estiloTramo(inicioAsignado, finAsignado)} /> : <span className={estilos.sinTramo}>No hay turno registrado</span>}</div></div>
        <div className={estilos.nivelGrafica}><strong>Nivel 2: Clasificación de horas</strong><div className={estilos.leyendaTiempo}><span className={estilos.normal}>Horas normales</span><span className={estilos.extraPendiente}>Extra pendiente</span><span className={estilos.extraAprobada}>Extra aprobada</span><span className={estilos.extraRechazada}>Extra rechazada</span><span className={estilos.sinAplica}>No aplica extra</span><span className={estilos.errorTiempo}>Error</span></div><div className={estilos.pistaTiempo}>
          {registros.flatMap((registro) => {
            const inicio = minutos(registro.entrada);
            const salida = minutos(registro.salida);
            if (inicio === null || salida === null) return [];
            
            const claseExtra = registro.estadoExtra === "APROBADA" ? estilos.extraAprobada : registro.estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
            const tramos = [];

            if (inicioAsignado !== null && finAsignado !== null) {
              if (inicio < inicioAsignado) {
                const finSegmento = Math.min(salida, inicioAsignado);
                tramos.push(<i key={`${registro.id}-pre`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(inicio, finSegmento)} />);
              }
              const inicioNormal = Math.max(inicio, inicioAsignado);
              const finNormal = Math.min(salida, finAsignado);
              if (inicioNormal < finNormal) {
                tramos.push(<i key={`${registro.id}-normal`} className={estilos.tramoNormal} style={estiloTramo(inicioNormal, finNormal)} />);
              }
              if (salida > finAsignado) {
                const inicioSegmento = Math.max(inicio, finAsignado);
                tramos.push(<i key={`${registro.id}-post`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(inicioSegmento, salida)} />);
              }
            } else {
              tramos.push(<i key={`${registro.id}-all`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(inicio, salida)} />);
            }
            return tramos;
          })}
        </div></div>
        <div className={estilos.nivelGrafica}><strong>Nivel 3: Registros de huella</strong><div className={`${estilos.pistaTiempo} ${estilos.pistaMarcaciones}`} aria-label="Marcaciones de entrada y salida">
          {marcaciones.map(([valor, clase, id, estadoExtra]) => {
             let clasePunto = "";
             if (inicioAsignado !== null && finAsignado !== null) {
                if ((valor as number) < inicioAsignado || (valor as number) > finAsignado) {
                   clasePunto = estadoExtra === "APROBADA" ? estilos.extraAprobada : estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
                }
             } else {
                clasePunto = estadoExtra === "APROBADA" ? estilos.extraAprobada : estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
             }
             return <i key={id} className={`${estilos.marcadorHuella} ${clase === "salida" ? estilos.marcadorSalida : ""} ${clasePunto}`} style={{ left: `${porcentaje(valor as number)}%` }} title={clase === "entrada" ? "Entrada" : "Salida"} />;
          })}
        </div></div>
        <div className={estilos.etiquetasEscala}><span>Escala de tiempo (05:00 a 23:00)</span><div>{horasEscala.map((hora) => <b key={hora}>{formatearHora(hora)}</b>)}</div></div>
      </div>
    </div>
  </section>;
}"""

pattern = r'function LineaTiempoDia.*?</section>;\s*\}'
content = re.sub(pattern, new_func, content, flags=re.DOTALL)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced LineaTiempoDia perfectly!')
