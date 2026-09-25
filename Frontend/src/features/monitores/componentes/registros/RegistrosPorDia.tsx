"use client";

import { useMemo, useState, useEffect, type CSSProperties } from "react";
import type { HorarioMonitor, SesionMonitor } from "@/features/monitores/tipos/modelosMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { Paginacion } from "../Paginacion";
import estilos from "../SistemaVisualMonitores.module.css";

const etiquetas = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada", NO_APLICA: "No aplica" } as const;
const inicioEscala = 5 * 60;
const finEscala = 23 * 60;
const horasEscala = Array.from({ length: 19 }, (_, indice) => inicioEscala + indice * 60);

function minutos(valor: string) {
  const coincidencia = valor.match(/(\d{1,2}):(\d{2})/);
  return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : null;
}

function porcentaje(minuto: number) { return Math.max(0, Math.min(100, ((minuto - inicioEscala) / (finEscala - inicioEscala)) * 100)); }
function estiloTramo(inicio: number, fin: number) {
  const desde = porcentaje(inicio); const hasta = Math.max(desde + .35, porcentaje(fin));
  return { "--inicio": `${desde}%`, "--ancho": `${hasta - desde}%` } as CSSProperties;
}
function diaSemana(fecha: string) { return (new Date(`${fecha}T12:00:00`).getDay() + 6) % 7; }
function formatearHora(valor: number) { return `${String(Math.floor(valor / 60)).padStart(2, "0")}:00`; }

function LineaTiempoDia({ fecha, registros, horarios }: { fecha: string; registros: SesionMonitor[]; horarios: HorarioMonitor[] }) {
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
}

export function RegistrosPorDia({ sesiones, horarios = [] }: { sesiones: SesionMonitor[]; horarios?: HorarioMonitor[] }) {
  const dias = useMemo(() => Object.entries(sesiones.reduce<Record<string, SesionMonitor[]>>((acumulado, sesion) => ({ ...acumulado, [sesion.fecha]: [...(acumulado[sesion.fecha] ?? []), sesion] }), {})).sort(([a], [b]) => b.localeCompare(a)), [sesiones]);
  const paginacion = usarPaginacion(dias, 6); const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fechaParam = params.get("fecha");
      if (fechaParam && dias.length > 0) {
        setAbierto(fechaParam);
        const indice = dias.findIndex(([fecha]) => fecha === fechaParam);
        if (indice !== -1) {
          const paginaDestino = Math.floor(indice / 6) + 1;
          paginacion.irA(paginaDestino);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);
  return <section className={`${estilos.tarjeta} ${estilos.registrosPorDia}`}><header><div><h2>Registros por día</h2><p>{dias.length} días con registros.</p></div></header><p className={estilos.guia}><strong>Guía rápida:</strong> abre un día para ver la línea de tiempo multinivel y sus marcaciones.</p><div className={estilos.listaDias}>{paginacion.visibles.map(([fecha, registros]) => <article className={estilos.diaRegistro} key={fecha}><button type="button" onClick={() => setAbierto((actual) => actual === fecha ? null : fecha)} aria-expanded={abierto === fecha}><span><strong>{fecha}</strong><small>{registros.length} marcación{registros.length === 1 ? "" : "es"}</small></span><span aria-hidden="true">{abierto === fecha ? "▾" : "▸"}</span></button>{abierto === fecha && <><LineaTiempoDia fecha={fecha} registros={registros} horarios={horarios}/><div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaRegistrosDia}`}><thead><tr><th>Entrada</th><th>Salida</th><th>Normales</th><th>Extra</th><th>Retraso</th><th>Estado extra</th></tr></thead><tbody>{registros.map((registro) => <tr key={registro.id}><td>{registro.entrada}</td><td>{registro.salida}</td><td>{registro.horasNormales.toFixed(1)} h</td><td>{registro.horasExtra.toFixed(1)} h</td><td>{registro.horasRetraso.toFixed(1)} h {registro.retrasoExento && <span className={`${estilos.insignia} ${estilos.informacion}`}>Exento</span>}</td><td><span className={`${estilos.insignia} ${registro.estadoExtra === "APROBADA" ? estilos.exito : registro.estadoExtra === "PENDIENTE" ? estilos.advertencia : registro.estadoExtra === "RECHAZADA" ? estilos.peligro : estilos.neutro}`}>{etiquetas[registro.estadoExtra]}</span></td></tr>)}</tbody></table></div></>}</article>)}</div>{!dias.length && <p className={estilos.estadoVacioRegistros}>Sin historial.</p>}<Paginacion {...paginacion} total={dias.length} /></section>;
}
