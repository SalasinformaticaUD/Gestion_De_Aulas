"use client";

import { useMemo, useState, type CSSProperties } from "react";
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
  const horario = horarios.find((item) => item.activo && item.dia === dias[diaSemana(fecha)]);
  const inicioAsignado = horario ? minutos(horario.horaInicio) : null;
  const finAsignado = horario ? minutos(horario.horaFin) : null;
  const primerInicio = registros.map((item) => minutos(item.entrada)).find((valor): valor is number => valor !== null);
  const ultimaSalida = [...registros].reverse().map((item) => minutos(item.salida)).find((valor): valor is number => valor !== null);
  const extra = registros.find((item) => item.horasExtra > 0);
  const claseExtra = extra?.estadoExtra === "APROBADA" ? estilos.extraAprobada : extra?.estadoExtra === "RECHAZADA" ? estilos.extraRechazada : estilos.extraPendiente;
  const horasTrabajadas = registros.reduce((total, item) => total + item.horasNormales + (item.estadoExtra === "APROBADA" ? item.horasExtra : 0), 0);
  const marcaciones = registros.flatMap((registro) => [[minutos(registro.entrada), "entrada", registro.id], [minutos(registro.salida), "salida", `${registro.id}-salida`]] as const).filter(([valor]) => valor !== null);

  return <section className={estilos.lineaTiempoRegistro} aria-label={`Línea de tiempo del ${fecha}`}>
    <div className={estilos.cabeceraLineaTiempo}><div><strong>Visualización de jornada</strong><span>{horario ? `Horario asignado: ${horario.horaInicio} – ${horario.horaFin}` : "Sin horario asignado para este día"}</span></div><span className={estilos.insignia}>{horasTrabajadas.toFixed(1)} h trabajadas</span></div>
    <div className={estilos.escalaGrafica} aria-hidden="true">{horasEscala.map((hora) => <span key={hora} style={{ left: `${porcentaje(hora)}%` }} />)}</div>
    <div className={estilos.nivelGrafica}><strong>Nivel 1: Horario asignado</strong><div className={estilos.pistaTiempo}>{inicioAsignado !== null && finAsignado !== null ? <i className={estilos.tramoAsignado} style={estiloTramo(inicioAsignado, finAsignado)} /> : <span className={estilos.sinTramo}>No hay turno registrado</span>}</div></div>
    <div className={estilos.nivelGrafica}><strong>Nivel 2: Clasificación de horas</strong><div className={estilos.leyendaTiempo}><span className={estilos.normal}>Horas normales</span><span className={estilos.extraPendiente}>Extra pendiente</span><span className={estilos.extraAprobada}>Extra aprobada</span><span className={estilos.extraRechazada}>Extra rechazada</span><span className={estilos.sinAplica}>No aplica extra</span><span className={estilos.errorTiempo}>Error</span></div><div className={estilos.pistaTiempo}>{primerInicio !== undefined && ultimaSalida !== undefined && <i className={estilos.tramoNormal} style={estiloTramo(primerInicio, ultimaSalida)} />}{extra && ultimaSalida !== undefined && <i className={`${estilos.tramoExtra} ${claseExtra}`} style={estiloTramo(ultimaSalida - extra.horasExtra * 60, ultimaSalida)} />}</div></div>
    <div className={estilos.nivelGrafica}><strong>Nivel 3: Registros de huella</strong><div className={`${estilos.pistaTiempo} ${estilos.pistaMarcaciones}`}>{marcaciones.map(([valor, clase, id]) => <i key={id} className={`${estilos.marcadorHuella} ${clase === "salida" ? estilos.marcadorSalida : ""}`} style={{ left: `${porcentaje(valor as number)}%` }} title={clase === "entrada" ? "Entrada" : "Salida"} />)}</div></div>
    <div className={estilos.etiquetasEscala}><span>Escala de tiempo (05:00 a 23:00)</span><div>{horasEscala.map((hora) => <b key={hora}>{formatearHora(hora)}</b>)}</div></div>
  </section>;
}

export function RegistrosPorDia({ sesiones, horarios = [] }: { sesiones: SesionMonitor[]; horarios?: HorarioMonitor[] }) {
  const dias = useMemo(() => Object.entries(sesiones.reduce<Record<string, SesionMonitor[]>>((acumulado, sesion) => ({ ...acumulado, [sesion.fecha]: [...(acumulado[sesion.fecha] ?? []), sesion] }), {})).sort(([a], [b]) => b.localeCompare(a)), [sesiones]);
  const paginacion = usarPaginacion(dias, 6); const [abierto, setAbierto] = useState<string | null>(null);
  return <section className={`${estilos.tarjeta} ${estilos.registrosPorDia}`}><header><div><h2>Registros por día</h2><p>{dias.length} días con registros.</p></div></header><p className={estilos.guia}><strong>Guía rápida:</strong> abre un día para ver la línea de tiempo multinivel y sus marcaciones.</p><div className={estilos.listaDias}>{paginacion.visibles.map(([fecha, registros]) => <article className={estilos.diaRegistro} key={fecha}><button type="button" onClick={() => setAbierto((actual) => actual === fecha ? null : fecha)} aria-expanded={abierto === fecha}><span><strong>{fecha}</strong><small>{registros.length} marcación{registros.length === 1 ? "" : "es"}</small></span><span aria-hidden="true">{abierto === fecha ? "▾" : "▸"}</span></button>{abierto === fecha && <><LineaTiempoDia fecha={fecha} registros={registros} horarios={horarios}/><div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaRegistrosDia}`}><thead><tr><th>Entrada</th><th>Salida</th><th>Normales</th><th>Extra</th><th>Retraso</th><th>Estado extra</th></tr></thead><tbody>{registros.map((registro) => <tr key={registro.id}><td>{registro.entrada}</td><td>{registro.salida}</td><td>{registro.horasNormales.toFixed(1)} h</td><td>{registro.horasExtra.toFixed(1)} h</td><td>{registro.horasRetraso.toFixed(1)} h {registro.retrasoExento && <span className={`${estilos.insignia} ${estilos.informacion}`}>Exento</span>}</td><td><span className={`${estilos.insignia} ${registro.estadoExtra === "APROBADA" ? estilos.exito : registro.estadoExtra === "PENDIENTE" ? estilos.advertencia : registro.estadoExtra === "RECHAZADA" ? estilos.peligro : estilos.neutro}`}>{etiquetas[registro.estadoExtra]}</span></td></tr>)}</tbody></table></div></>}</article>)}</div>{!dias.length && <p className={estilos.estadoVacioRegistros}>Sin historial.</p>}<Paginacion {...paginacion} total={dias.length} /></section>;
}
