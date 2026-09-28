import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/registros/RegistrosPorDia.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """function LineaTiempoDia({ fecha, registros, horarios }: { fecha: string; registros: SesionMonitor[]; horarios: HorarioMonitor[] }) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const nombreDia = dias[diaSemana(fecha)];
  const horariosDelDia = horarios.filter((item) => item.activo && item.dia === nombreDia).sort((a, b) => (minutos(a.horaInicio) || 0) - (minutos(b.horaInicio) || 0));
  
  const horasTrabajadas = registros.reduce((total, item) => total + item.horasNormales + (item.estadoExtra === "APROBADA" ? item.horasExtra : 0), 0);
  const marcaciones = registros.flatMap((registro) => [[minutos(registro.entrada), "entrada", registro.id, registro.estadoExtra], [minutos(registro.salida), "salida", `${registro.id}-salida`, registro.estadoExtra]] as const).filter(([valor]) => valor !== null);
  
  const turnos = horariosDelDia.map(h => ({ start: minutos(h.horaInicio)!, end: minutos(h.horaFin)! })).filter(t => t.start !== null && t.end !== null);

  return <section className={estilos.lineaTiempoRegistro} aria-label={`Línea de tiempo del ${fecha}`}>
    <div className={estilos.cabeceraLineaTiempo}><div><strong>Visualización de jornada</strong><span>{horariosDelDia.length > 0 ? `Horario asignado: ${horariosDelDia.map(h => `${h.horaInicio} – ${h.horaFin}`).join(", ")}` : "Sin horario asignado para este día"}</span></div><span className={estilos.insignia}>{horasTrabajadas.toFixed(1)} h trabajadas</span></div>
    <p className={estilos.ayudaDesplazamientoLinea}>Deslice horizontalmente para consultar toda la jornada.</p>
    <div className={estilos.desplazamientoLineaTiempo} tabIndex={0} aria-label="Línea de tiempo desplazable horizontalmente">
      <div className={estilos.contenidoLineaTiempo}>
        <div className={estilos.escalaGrafica} aria-hidden="true">{horasEscala.map((hora) => <span key={hora} style={{ left: `${porcentaje(hora)}%` }} />)}</div>
        <div className={estilos.nivelGrafica}><strong>Nivel 1: Horario asignado</strong><div className={estilos.pistaTiempo}>{turnos.length > 0 ? turnos.map((turno, i) => <i key={i} className={estilos.tramoAsignado} style={estiloTramo(turno.start, turno.end)} />) : <span className={estilos.sinTramo}>No hay turno registrado</span>}</div></div>
        <div className={estilos.nivelGrafica}><strong>Nivel 2: Clasificación de horas</strong><div className={estilos.leyendaTiempo}><span className={estilos.normal}>Horas normales</span><span className={estilos.extraPendiente}>Extra pendiente</span><span className={estilos.extraAprobada}>Extra aprobada</span><span className={estilos.extraRechazada}>Extra rechazada</span><span className={estilos.sinAplica}>No aplica extra</span><span className={estilos.errorTiempo}>Error</span></div><div className={estilos.pistaTiempo}>
          {registros.flatMap((registro) => {
            const inicio = minutos(registro.entrada);
            const salida = minutos(registro.salida);
            if (inicio === null || salida === null) return [];
            
            const claseExtra = registro.estadoExtra === "APROBADA" ? estilos.extraAprobada : registro.estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
            const tramos = [];
            
            if (turnos.length > 0) {
              let cursor = inicio;
              for (const turno of turnos) {
                 if (cursor >= salida) break;
                 if (cursor < turno.start) {
                    const endExtra = Math.min(salida, turno.start);
                    tramos.push(<i key={`${registro.id}-pre-${turno.start}`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(cursor, endExtra)} />);
                    cursor = endExtra;
                 }
                 if (cursor < salida && cursor < turno.end) {
                    const endNormal = Math.min(salida, turno.end);
                    tramos.push(<i key={`${registro.id}-norm-${turno.start}`} className={estilos.tramoNormal} style={estiloTramo(cursor, endNormal)} />);
                    cursor = endNormal;
                 }
              }
              if (cursor < salida) {
                 tramos.push(<i key={`${registro.id}-post`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(cursor, salida)} />);
              }
            } else {
              tramos.push(<i key={`${registro.id}-all`} className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(inicio, salida)} />);
            }
            return tramos;
          })}
        </div></div>
        <div className={estilos.nivelGrafica}><strong>Nivel 3: Registros de huella</strong><div className={`${estilos.pistaTiempo} ${estilos.pistaMarcaciones}`} aria-label="Marcaciones de entrada y salida">
          {marcaciones.map(([valor, clase, id, estadoExtra]) => {
             const val = valor as number;
             const esNormal = turnos.some(t => val >= t.start && val <= t.end);
             const clasePunto = esNormal ? "" : (estadoExtra === "APROBADA" ? estilos.extraAprobada : estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente);
             
             return <i key={id} className={`${estilos.marcadorHuella} ${clase === "salida" ? estilos.marcadorSalida : ""} ${clasePunto}`} style={{ left: `${porcentaje(val)}%` }} title={clase === "entrada" ? "Entrada" : "Salida"} />;
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
print('Replaced LineaTiempoDia logic to handle multiple shifts!')
