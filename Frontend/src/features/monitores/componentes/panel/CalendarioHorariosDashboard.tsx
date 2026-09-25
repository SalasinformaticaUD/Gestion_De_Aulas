"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { HorarioApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "../SistemaVisualMonitores.module.css";

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const diasCortos = ["L", "M", "X", "J", "V", "S"];
const horaInicial = 6;
const horaFinal = 22;
const minutosTotales = (horaFinal - horaInicial) * 60;

type HorarioPosicionado = HorarioApi & { carril: number; carriles: number };
type FranjaSeleccionada = { weekday: number; start: number; end: number };
type EstiloBloque = CSSProperties & {
  "--inicio": string;
  "--duracion": string;
  "--carril": number;
  "--carriles": number;
  "--color-monitor": string;
  "--fondo-monitor": string;
};

function aMinutos(hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function colorMonitor(id: string) {
  let hash = 0;
  for (const caracter of id) hash = caracter.charCodeAt(0) + ((hash << 5) - hash);
  const tono = Math.abs(hash) % 360;
  return { borde: `hsl(${tono} 62% 38%)`, fondo: `hsl(${tono} 72% 91%)` };
}

function posicionar(horarios: HorarioApi[]): HorarioPosicionado[] {
  const ordenados = [...horarios].sort((a, b) => aMinutos(a.start_time) - aMinutos(b.start_time));
  const resultado: HorarioPosicionado[] = [];
  let grupo: HorarioApi[] = [];
  let finGrupo = -1;

  const cerrarGrupo = () => {
    if (!grupo.length) return;
    const finalesCarril: number[] = [];
    const temporales = grupo.map((horario) => {
      const inicio = aMinutos(horario.start_time);
      let carril = finalesCarril.findIndex((fin) => fin <= inicio);
      if (carril < 0) carril = finalesCarril.length;
      finalesCarril[carril] = aMinutos(horario.end_time);
      return { horario, carril };
    });
    const carriles = Math.max(1, finalesCarril.length);
    resultado.push(...temporales.map(({ horario, carril }) => ({ ...horario, carril, carriles })));
    grupo = [];
    finGrupo = -1;
  };

  for (const horario of ordenados) {
    const inicio = aMinutos(horario.start_time);
    if (grupo.length && inicio >= finGrupo) cerrarGrupo();
    grupo.push(horario);
    finGrupo = Math.max(finGrupo, aMinutos(horario.end_time));
  }
  cerrarGrupo();
  return resultado;
}

export function CalendarioHorariosDashboard({ dependencia, horarios }: { dependencia?: string; horarios?: HorarioApi[] }) {
  const modoPersonal = horarios !== undefined;
  const cargarHorarios = useCallback(() => horarios ? Promise.resolve(horarios) : servicioMonitores.listarHorarios(), [horarios]);
  const cargarMonitores = useCallback(() => horarios ? Promise.resolve([] as { id: string; department?: string; is_active?: boolean }[]) : servicioMonitores.listarMonitores(), [horarios]);
  const recurso = usarRecursoApi(cargarHorarios, [] as HorarioApi[]);
  const recursoMonitores = usarRecursoApi(cargarMonitores, [] as { id: string; department?: string; is_active?: boolean }[]);
  const [monitorSeleccionado, setMonitorSeleccionado] = useState<string | null>(null);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<HorarioApi | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  const idsDependencia = useMemo(() => new Set(modoPersonal ? recurso.datos.map((horario) => horario.monitor) : recursoMonitores.datos.filter((monitor) => monitor.is_active && (!dependencia || monitor.department === dependencia)).map((monitor) => monitor.id)), [modoPersonal, recurso.datos, recursoMonitores.datos, dependencia]);
  const activos = useMemo(() => recurso.datos.filter((horario) => horario.is_active && idsDependencia.has(horario.monitor)), [recurso.datos, idsDependencia]);
    const tieneSabado = useMemo(() => activos.some((horario) => horario.weekday === 5), [activos]);
    const diasVisibles = tieneSabado ? 6 : 5;
  const visibles = useMemo(
    () => activos.filter((horario) => !monitorSeleccionado || horario.monitor === monitorSeleccionado),
    [activos, monitorSeleccionado],
  );
  const nombreSeleccionado = activos.find((horario) => horario.monitor === monitorSeleccionado)?.monitor_name;
  const monitores = useMemo(() => {
    const unicos = new Map<string, string>();
    activos.forEach((horario) => unicos.set(horario.monitor, horario.monitor_name));
    return [...unicos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [activos]);
  const porDia = useMemo(
    () => dias.slice(0, diasVisibles).map((_, indice) => posicionar(visibles.filter((horario) => horario.weekday === indice))),
    [visibles],
  );
  const horas = Array.from({ length: horaFinal - horaInicial + 1 }, (_, indice) => horaInicial + indice);
  const diaActual = (ahora.getDay() + 6) % 7;
  const [diaMovil, setDiaMovil] = useState(diaActual < diasVisibles ? diaActual : 0);
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
  const dentroDeJornada = diaActual < diasVisibles && minutoActual >= horaInicial * 60 && minutoActual <= horaFinal * 60;
  const posicionActual = `${((minutoActual - horaInicial * 60) / minutosTotales) * 100}%`;
  const franjaActual = `${((Math.floor(minutoActual / 60) * 60 - horaInicial * 60) / minutosTotales) * 100}%`;

  const limpiarSeleccion = () => {
    setMonitorSeleccionado(null);
    setBloqueSeleccionado(null);
  };

  const alternarMonitor = (monitor: string) => {
    setMonitorSeleccionado((actual) => actual === monitor ? null : monitor);
    setBloqueSeleccionado(null);
  };

  const seleccionarBloque = (horario: HorarioApi) => {
    if (diaMovil !== -1) return;
    if (bloqueSeleccionado?.id === horario.id) {
      limpiarSeleccion();
      return;
    }
    setMonitorSeleccionado(horario.monitor);
    setBloqueSeleccionado(horario);
  };

  useEffect(() => {
    if (bloqueSeleccionado && !activos.some((horario) => horario.id === bloqueSeleccionado.id)) {
      setBloqueSeleccionado(null);
    }
  }, [activos, bloqueSeleccionado]);

  return <section className={`${estilos.tarjeta} ${estilos.horarioDashboard} ${modoPersonal ? estilos.horarioDashboardPersonal : estilos.horarioDashboardGeneral} ${diaMovil !== -1 ? estilos.vistaDiaria : ""} ${diasVisibles === 5 ? estilos.rejillaDias5 : estilos.rejillaDias6}`} aria-labelledby="titulo-horario-dashboard">
    <header>
      <div>
        <h2 id="titulo-horario-dashboard">{modoPersonal ? "Mi horario semanal" : "Horario semanal"}</h2>
        <p>{modoPersonal ? "Sus turnos asignados para el periodo académico actual." : monitorSeleccionado ? `Vista individual de ${nombreSeleccionado}.` : "Monitores distribuidos por día y franja horaria."}</p>
      </div>
      <div className={estilos.accionesHorarioDashboard}>
        {!modoPersonal && monitorSeleccionado && <button type="button" className={estilos.botonSecundario} onClick={limpiarSeleccion}>Ocultar</button>}
        <span className={`${estilos.insignia} ${estilos.neutro}`}>{visibles.length} bloque(s)</span>
      </div>
    </header>

    {recurso.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{recurso.error}</div>}
    {!recurso.error && <>
      {!modoPersonal && <><div className={estilos.leyendaHorario} aria-label="Colores de monitores">
        {monitores.map(([id, nombre]) => {
          const color = colorMonitor(id);
          return <button key={id} type="button" aria-pressed={monitorSeleccionado === id} className={monitorSeleccionado === id ? estilos.monitorLeyendaActivo : undefined} onClick={() => alternarMonitor(id)}>
            <i style={{ backgroundColor: color.borde }} />{nombre}
          </button>;
        })}
      </div>
      <p className={estilos.ayudaHorario}>{monitorSeleccionado ? "Haz clic nuevamente en cualquier bloque o en el nombre seleccionado para volver a la vista general." : "Haz clic en un bloque para consultar el detalle de esa monitoría y filtrar el horario del monitor."}</p></>}
      {bloqueSeleccionado && <section className={estilos.detalleFranjaHorario} aria-live="polite">
        <header>
          <div>
            <span>Detalle de monitoría</span>
            <h3>{bloqueSeleccionado.monitor_name}</h3>
            <p>Información asignada a este bloque del horario semanal.</p>
          </div>
          <button type="button" className={estilos.botonSecundario} onClick={() => setBloqueSeleccionado(null)} aria-label="Cerrar detalle de monitoría">Cerrar</button>
        </header>
        <div className={estilos.datosDetalleHorario}>
          <div><span>Día</span><strong>{dias[bloqueSeleccionado.weekday]}</strong></div>
          <div><span>Horario</span><strong>{bloqueSeleccionado.start_time.slice(0, 5)}–{bloqueSeleccionado.end_time.slice(0, 5)}</strong></div>
          <div><span>Ubicación</span><strong>{bloqueSeleccionado.location || "Sin ubicación registrada"}</strong></div>
          <div><span>Asignatura</span><strong>{bloqueSeleccionado.asignatura || "Sin asignatura registrada"}</strong></div>
          <div><span>Grupo</span><strong>{bloqueSeleccionado.grupo || "Sin grupo registrado"}</strong></div>
          <div><span>Docente</span><strong>{bloqueSeleccionado.docente || "Sin docente registrado"}</strong></div>
          <div><span>Proyecto curricular</span><strong>{bloqueSeleccionado.proyecto_curricular || "Sin proyecto registrado"}</strong></div>
        </div>
      </section>}
      <div className={estilos.selectorDiaMovil}>
          <button
            type="button"
            className={diaMovil === -1 ? estilos.diaMovilActivo : ""}
            onClick={() => { setDiaMovil(-1); }}
          >
            Semana
          </button>
          {dias.slice(0, diasVisibles).map((dia, indice) => (
            <button
              key={dia}
              type="button"
              className={diaMovil === indice ? estilos.diaMovilActivo : ""}
              onClick={() => { setDiaMovil(indice); limpiarSeleccion(); }}
            >
              {dia}
            </button>
          ))}
        </div>
        <div className={estilos.desplazamientoHorario} >
        <div className={estilos.cabeceraHorario}>
          <span>Hora</span>{dias.slice(0, diasVisibles).map((dia, indice) => <strong key={dia} className={`${diaActual === indice ? estilos.diaHorarioActual : ""} ${diaMovil !== -1 && diaMovil !== indice ? estilos.ocultoEnMovil : ""}`} aria-label={`${dia}${diaActual === indice ? ", hoy" : ""}`}><span className={estilos.nombreDiaCompleto}>{dia}</span><span className={estilos.nombreDiaCorto} aria-hidden="true">{diasCortos[indice]}</span>{diaActual === indice && <small>Hoy</small>}</strong>)}
        </div>
        <div className={estilos.cuerpoHorario}>
          <div className={estilos.escalaHorario}>{horas.map((hora) => <span key={hora} style={{ top: `${((hora - horaInicial) * 60 / minutosTotales) * 100}%` }}>{String(hora).padStart(2, "0")}:00</span>)}</div>
          {dias.slice(0, diasVisibles).map((dia, indice) => <div key={dia} className={`${estilos.columnaDiaHorario} ${diaActual === indice ? estilos.columnaDiaActual : ""} ${diaMovil !== -1 && diaMovil !== indice ? estilos.ocultoEnMovil : ""}`}>
            {horas.slice(0, -1).map((hora) => <i key={hora} className={estilos.lineaHora} style={{ top: `${((hora - horaInicial) * 60 / minutosTotales) * 100}%` }} />)}
            {dentroDeJornada && diaActual === indice && <><span className={estilos.franjaHoraActual} style={{ top: franjaActual }} /><span className={estilos.lineaHoraActual} style={{ top: posicionActual }}><b>{ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false })}</b></span></>}
            {porDia[indice].map((horario) => {
              const inicio = Math.max(aMinutos(horario.start_time), horaInicial * 60);
              const fin = Math.min(aMinutos(horario.end_time), horaFinal * 60);
              if (fin <= inicio) return null;
              const color = colorMonitor(horario.monitor);
              const style: EstiloBloque = {
                "--inicio": `${((inicio - horaInicial * 60) / minutosTotales) * 100}%`,
                "--duracion": `${((fin - inicio) / minutosTotales) * 100}%`,
                "--carril": horario.carril,
                "--carriles": horario.carriles,
                "--color-monitor": color.borde,
                "--fondo-monitor": color.fondo,
              };
              const tituloBloque = modoPersonal
                ? `${horario.start_time.slice(0, 5)} a ${horario.end_time.slice(0, 5)} · ${horario.location || "Sin ubicación"}`
                : `${horario.monitor_name}: ${horario.start_time.slice(0, 5)} a ${horario.end_time.slice(0, 5)} · ${horario.location}`;
              return <button key={horario.id} type="button" className={estilos.bloqueHorarioDashboard} style={{ ...style, cursor: diaMovil !== -1 ? "default" : "pointer" }} aria-pressed={monitorSeleccionado === horario.monitor} onClick={() => seleccionarBloque(horario)} title={tituloBloque}>
                {!modoPersonal && <strong>{horario.monitor_name}</strong>}
                {modoPersonal
                  ? <><span className={estilos.horaBloquePersonal}><b>{horario.start_time.slice(0, 5)}</b><i aria-hidden="true">–</i><b>{horario.end_time.slice(0, 5)}</b></span><small className={estilos.lugarBloquePersonal}>{horario.location || "Sin ubicación"}</small></>
                  : <><span>{horario.start_time.slice(0, 5)}–{horario.end_time.slice(0, 5)}</span><small>{horario.location}{horario.asignatura ? ` · ${horario.asignatura}` : ""}</small></>}
              </button>;
            })}
          </div>)}
        </div>
      </div>
      {!recurso.cargando && !activos.length && <p className={estilos.vacio}>No hay horarios activos para mostrar.</p>}
      {recurso.cargando && <p className={estilos.vacio}>Cargando horario semanal…</p>}
    </>}
  </section>;
}

