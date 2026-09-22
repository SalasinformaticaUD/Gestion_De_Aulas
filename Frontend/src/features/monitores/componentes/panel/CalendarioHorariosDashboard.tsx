"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { HorarioApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "../SistemaVisualMonitores.module.css";

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
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

export function CalendarioHorariosDashboard() {
  const recurso = usarRecursoApi(servicioMonitores.listarHorarios, [] as HorarioApi[]);
  const [monitorSeleccionado, setMonitorSeleccionado] = useState<string | null>(null);
  const [franjaSeleccionada, setFranjaSeleccionada] = useState<FranjaSeleccionada | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  const activos = useMemo(() => recurso.datos.filter((horario) => horario.is_active), [recurso.datos]);
  const visibles = useMemo(
    () => activos.filter((horario) => !monitorSeleccionado || horario.monitor === monitorSeleccionado),
    [activos, monitorSeleccionado],
  );
  const nombreSeleccionado = activos.find((horario) => horario.monitor === monitorSeleccionado)?.monitor_name;
  const monitoresEnFranja = useMemo(() => {
    if (!franjaSeleccionada) return [];
    return activos
      .filter((horario) => horario.weekday === franjaSeleccionada.weekday
        && aMinutos(horario.start_time) < franjaSeleccionada.end
        && aMinutos(horario.end_time) > franjaSeleccionada.start)
      .sort((a, b) => aMinutos(a.start_time) - aMinutos(b.start_time)
        || a.monitor_name.localeCompare(b.monitor_name, "es"));
  }, [activos, franjaSeleccionada]);
  const monitores = useMemo(() => {
    const unicos = new Map<string, string>();
    activos.forEach((horario) => unicos.set(horario.monitor, horario.monitor_name));
    return [...unicos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [activos]);
  const porDia = useMemo(
    () => dias.map((_, indice) => posicionar(visibles.filter((horario) => horario.weekday === indice))),
    [visibles],
  );
  const horas = Array.from({ length: horaFinal - horaInicial + 1 }, (_, indice) => horaInicial + indice);
  const diaActual = (ahora.getDay() + 6) % 7;
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
  const dentroDeJornada = diaActual < dias.length && minutoActual >= horaInicial * 60 && minutoActual <= horaFinal * 60;
  const posicionActual = `${((minutoActual - horaInicial * 60) / minutosTotales) * 100}%`;
  const franjaActual = `${((Math.floor(minutoActual / 60) * 60 - horaInicial * 60) / minutosTotales) * 100}%`;

  const alternarMonitor = (monitor: string) => {
    setMonitorSeleccionado((actual) => actual === monitor ? null : monitor);
  };

  const seleccionarBloque = (horario: HorarioApi) => {
    setFranjaSeleccionada({
      weekday: horario.weekday,
      start: aMinutos(horario.start_time),
      end: aMinutos(horario.end_time),
    });
    alternarMonitor(horario.monitor);
  };

  return <section className={`${estilos.tarjeta} ${estilos.horarioDashboard}`} aria-labelledby="titulo-horario-dashboard">
    <header>
      <div>
        <h2 id="titulo-horario-dashboard">Horario semanal</h2>
        <p>{monitorSeleccionado ? `Vista individual de ${nombreSeleccionado}.` : "Monitores distribuidos por día y franja horaria."}</p>
      </div>
      <div className={estilos.accionesHorarioDashboard}>
        {monitorSeleccionado && <button type="button" className={estilos.botonSecundario} onClick={() => setMonitorSeleccionado(null)}>Ver todos</button>}
        <span className={`${estilos.insignia} ${estilos.neutro}`}>{visibles.length} bloque(s)</span>
      </div>
    </header>

    {recurso.error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{recurso.error}</div>}
    {!recurso.error && <>
      <div className={estilos.leyendaHorario} aria-label="Colores de monitores">
        {monitores.map(([id, nombre]) => {
          const color = colorMonitor(id);
          return <button key={id} type="button" aria-pressed={monitorSeleccionado === id} className={monitorSeleccionado === id ? estilos.monitorLeyendaActivo : undefined} onClick={() => alternarMonitor(id)}>
            <i style={{ backgroundColor: color.borde }} />{nombre}
          </button>;
        })}
      </div>
      <p className={estilos.ayudaHorario}>{monitorSeleccionado ? "Haz clic nuevamente en cualquier bloque o en el nombre seleccionado para volver a la vista general." : "Haz clic en un bloque para ver únicamente el horario de ese monitor."}</p>
      {franjaSeleccionada && <section className={estilos.detalleFranjaHorario} aria-live="polite">
        <header>
          <div>
            <span>Información de la franja</span>
            <h3>{dias[franjaSeleccionada.weekday]} · {String(Math.floor(franjaSeleccionada.start / 60)).padStart(2, "0")}:{String(franjaSeleccionada.start % 60).padStart(2, "0")}–{String(Math.floor(franjaSeleccionada.end / 60)).padStart(2, "0")}:{String(franjaSeleccionada.end % 60).padStart(2, "0")}</h3>
            <p>{monitoresEnFranja.length} monitor(es) coinciden total o parcialmente con este bloque.</p>
          </div>
          <button type="button" className={estilos.botonSecundario} onClick={() => setFranjaSeleccionada(null)} aria-label="Cerrar información de la franja">Cerrar</button>
        </header>
        <div className={estilos.listaMonitoresFranja}>
          {monitoresEnFranja.map((horario) => {
            const color = colorMonitor(horario.monitor);
            return <article key={horario.id} style={{ borderLeftColor: color.borde }}>
              <div>
                <strong>{horario.monitor_name}</strong>
                <span>{horario.start_time.slice(0, 5)}–{horario.end_time.slice(0, 5)} · {horario.location || "Sin ubicación"}</span>
              </div>
              <div>
                <b>{horario.asignatura || "Sin asignatura registrada"}</b>
                <small>{[horario.grupo && `Grupo ${horario.grupo}`, horario.docente].filter(Boolean).join(" · ") || "Sin grupo ni docente registrados"}</small>
              </div>
            </article>;
          })}
        </div>
      </section>}
      <div className={estilos.desplazamientoHorario}>
        <div className={estilos.cabeceraHorario}>
          <span>Hora</span>{dias.map((dia, indice) => <strong key={dia} className={diaActual === indice ? estilos.diaHorarioActual : undefined}>{dia}{diaActual === indice && <small>Hoy</small>}</strong>)}
        </div>
        <div className={estilos.cuerpoHorario}>
          <div className={estilos.escalaHorario}>{horas.map((hora) => <span key={hora} style={{ top: `${((hora - horaInicial) * 60 / minutosTotales) * 100}%` }}>{String(hora).padStart(2, "0")}:00</span>)}</div>
          {dias.map((dia, indice) => <div key={dia} className={`${estilos.columnaDiaHorario} ${diaActual === indice ? estilos.columnaDiaActual : ""}`}>
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
              return <button key={horario.id} type="button" className={estilos.bloqueHorarioDashboard} style={style} aria-pressed={monitorSeleccionado === horario.monitor} onClick={() => seleccionarBloque(horario)} title={`${horario.monitor_name}: ${horario.start_time.slice(0, 5)} a ${horario.end_time.slice(0, 5)} · ${horario.location}`}>
                <strong>{horario.monitor_name}</strong>
                <span>{horario.start_time.slice(0, 5)}–{horario.end_time.slice(0, 5)}</span>
                <small>{horario.location}{horario.asignatura ? ` · ${horario.asignatura}` : ""}</small>
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
