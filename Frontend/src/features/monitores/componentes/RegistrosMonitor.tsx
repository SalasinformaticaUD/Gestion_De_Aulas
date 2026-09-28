"use client";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import {
  adaptarHorario,
  adaptarMonitor,
  adaptarResumenDashboard,
  adaptarSesion,
} from "@/features/monitores/api/adaptadoresMonitores";
import type {
  DashboardApi,
  MonitorApi,
} from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { ResumenHoras } from "./ResumenHoras";
import estilos from "./SistemaVisualMonitores.module.css";
import { FichaMonitor } from "./registros/FichaMonitor";
import { RegistrosPorDia } from "./registros/RegistrosPorDia";

export function RegistrosMonitor({ monitorId }: { monitorId: string }) {
  const cargarDetalle = useCallback(
    () => servicioMonitores.obtenerDetalleRegistrosMonitor(monitorId),
    [monitorId],
  );
  const recursoMonitores = usarRecursoApi(
    servicioMonitores.listarMonitores,
    [] as MonitorApi[],
  );
  const detalle = usarRecursoApi(cargarDetalle, {
    sessions: [],
    schedules: [],
    annotations: [],
    inconsistencies: [],
  });
  const tablero = usarRecursoApi(servicioMonitores.obtenerDashboard, {
    monitor_rows: [],
    pending_overtime: [],
    recent_annotations: [],
    notifications: [],
  } as DashboardApi);
  const monitor = useMemo(
    () =>
      recursoMonitores.datos
        .map(adaptarMonitor)
        .find((item) => item.id === monitorId),
    [recursoMonitores.datos, monitorId],
  );
  const resumen = useMemo(
    () =>
      adaptarResumenDashboard(tablero.datos.monitor_rows).find(
        (item) => item.monitorId === monitorId,
      ),
    [tablero.datos.monitor_rows, monitorId],
  );
  const sesiones = useMemo(
    () => detalle.datos.sessions.map(adaptarSesion),
    [detalle.datos.sessions],
  );
  const horarios = useMemo(
    () => detalle.datos.schedules.map(adaptarHorario),
    [detalle.datos.schedules],
  );
  const anotaciones = useMemo(
    () => detalle.datos.annotations,
    [detalle.datos.annotations],
  );
  const inconsistencias = useMemo(
    () => detalle.datos.inconsistencies,
    [detalle.datos.inconsistencies],
  );
  const error = recursoMonitores.error || detalle.error || tablero.error;
  return (
    <div className={estilos.detalleRegistros}>
      <section className={`page-heading ${estilos.encabezado}`}>
        <div>
          <span className={estilos.etiqueta}>Detalle individual</span>
          <h1>Registros del monitor</h1>
          <p>
            Consulte marcaciones, horarios, inconsistencias, anotaciones y
            totales del periodo.
          </p>
        </div>
        <Link
          className={estilos.botonSecundario}
          href="/gestion-monitores/registros"
        >
          Volver a Registros
        </Link>
      </section>
      {error && (
        <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>
      )}
      {monitor ? (
        <>
          <FichaMonitor monitor={monitor} />
          {resumen && <ResumenHoras resumen={resumen} detalle />}
          <RegistrosPorDia sesiones={sesiones} horarios={horarios} />
          <section className={estilos.tarjeta}>
            <header>
              <div>
                <h2>Inconsistencias relacionadas</h2>
                <p>{inconsistencias.length} inconsistencia(s) del monitor.</p>
              </div>
            </header>
            <div className={estilos.tablaContenedor}>
              <table className={`${estilos.tabla} ${estilos.tablaInconsistenciasRelacionadas}`}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {inconsistencias.map((item) => (
                    <tr key={item.id}>
                      <td>{item.work_day}</td>
                      <td>{item.inconsistency_type_label}</td>
                      <td>
                        <span
                          className={`${estilos.insignia} ${item.status === "pending" ? estilos.advertencia : estilos.exito}`}
                        >
                          {item.status_label}
                        </span>
                      </td>
                      <td>{item.message}</td>
                    </tr>
                  ))}
                  {!inconsistencias.length && (
                    <tr>
                      <td colSpan={4} className={estilos.vacio}>
                        No hay inconsistencias relacionadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className={estilos.tarjeta}>
            <header>
              <div>
                <h2>Anotaciones relacionadas</h2>
                <p>{anotaciones.length} anotación(es) registradas.</p>
              </div>
            </header>
            <div className={estilos.tablaContenedor}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Acción</th>
                    <th>Ajuste</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {anotaciones.map((item) => (
                    <tr key={item.id}>
                      <td>{item.occurred_on}</td>
                      <td>{item.annotation_type.replaceAll("_", " ")}</td>
                      <td>{item.action}</td>
                      <td>{(item.delta_minutes / 60).toFixed(1)} h</td>
                      <td>{item.description}</td>
                    </tr>
                  ))}
                  {!anotaciones.length && (
                    <tr>
                      <td colSpan={5} className={estilos.vacio}>
                        No hay anotaciones relacionadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        !recursoMonitores.cargando && (
          <div className={`${estilos.aviso} ${estilos.avisoError}`}>
            El monitor solicitado no existe o no está dentro de su dependencia.
          </div>
        )
      )}
    </div>
  );
}
