"use client";

import { useCallback, useMemo, useState } from "react";
import { adaptarMonitor, adaptarResumenDashboard, nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import type { ConciliacionApi, DashboardApi, MonitorApi } from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import estilos from "./SistemaVisualMonitores.module.css";
import { ConsultaCodigo } from "./panel/ConsultaCodigo";
import { HistorialReciente } from "./panel/HistorialReciente";
import { HorasPorMonitor } from "./panel/HorasPorMonitor";
import { TarjetasSeguimiento } from "./panel/TarjetasSeguimiento";

const filasPorPagina = 8;
const historialInicial = { count: 0, next: null, previous: null, results: [] as ConciliacionApi[] };

function descargar(nombre: string, filas: string[][]) {
  const contenido = filas.map((fila) => fila.map((valor) => `"${valor.replaceAll('"', '""')}"`).join(";")).join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8;" }));
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function PanelMonitoresDependencias() {
  const tablero = usarRecursoApi(servicioMonitores.obtenerDashboard, { monitor_rows: [], pending_overtime: [], recent_annotations: [], notifications: [] } as DashboardApi);
  const recursoMonitores = usarRecursoApi(servicioMonitores.listarMonitores, [] as MonitorApi[]);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const cargarHistorial = useCallback(
    () => servicioMonitores.listarPaginaHistorialAsistencia(paginaHistorial),
    [paginaHistorial],
  );
  const historial = usarRecursoApi(cargarHistorial, historialInicial);
  const [busqueda, setBusqueda] = useState("");
  const [cerradas, setCerradas] = useState<string[]>([]);
  const [paginas, setPaginas] = useState<Record<string, number>>({});

  const monitores = useMemo(() => recursoMonitores.datos.map(adaptarMonitor), [recursoMonitores.datos]);
  const monitoresFiltrados = useMemo(() => {
    const termino = busqueda.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").trim();
    if (!termino) return monitores;
    return monitores.filter((monitor) => {
      const nombre = monitor.nombre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
      const codigo = monitor.codigo.toLocaleLowerCase("es");
      return nombre.includes(termino) || codigo.includes(termino);
    });
  }, [busqueda, monitores]);
  const resumenes = useMemo(() => adaptarResumenDashboard(tablero.datos.monitor_rows), [tablero.datos.monitor_rows]);
  const dependencias = useMemo(() => [...new Set(monitoresFiltrados.map((item) => item.dependencia))], [monitoresFiltrados]);
  const totalPaginasHistorial = Math.max(1, Math.ceil(historial.datos.count / filasPorPagina));
  const error = tablero.error || recursoMonitores.error || historial.error;

  const actualizarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPaginas({});
  };

  const exportarDependencia = (dependencia: string) => {
    const filas = monitoresFiltrados.filter((monitor) => monitor.dependencia === dependencia);
    descargar(`horas_${dependencia.toLowerCase().replaceAll(" ", "_")}`, [["Monitor", "Normales (h)", "Horas extra aprobadas (h)", "Horas extra por aprobar (h)", "Anotaciones (h)", "Total (h)", "Faltan para 192 h"], ...filas.map((monitor) => {
      const resumen = resumenes.find((item) => item.monitorId === monitor.id);
      const total = (resumen?.horasNormales ?? 0) + (resumen?.horasExtraAprobadas ?? 0) + (resumen?.horasAnotaciones ?? 0);
      return [monitor.nombre, (resumen?.horasNormales ?? 0).toFixed(1), (resumen?.horasExtraAprobadas ?? 0).toFixed(1), (resumen?.horasExtraPendientes ?? 0).toFixed(1), (resumen?.horasAnotaciones ?? 0).toFixed(1), total.toFixed(1), Math.max(0, 192 - total).toFixed(1)];
    })]);
  };

  const exportarHistorial = () => descargar("historial_reciente_registros", [["Nombre crudo", "Dependencia", "Fecha", "Estado", "Monitor"], ...historial.datos.results.map((item) => [item.raw_full_name, nombreDependencia(item.raw_department), item.work_day, item.reconciliation_status === "matched" ? "Conciliado" : "Rechazado", item.monitor_name || "-"])]);

  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>Panel de monitores</h1><p>Consulta y seguimiento de registros de los monitores de su dependencia.</p></div></section>
    <ConsultaCodigo busqueda={busqueda} total={monitores.length} visibles={monitoresFiltrados.length} onBusquedaChange={actualizarBusqueda} />
    {error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}
    <HorasPorMonitor dependencias={dependencias} monitores={monitoresFiltrados} resumenes={resumenes} cerradas={busqueda.trim() ? [] : cerradas} paginas={paginas} filasPorPagina={filasPorPagina} onAlternar={(dependencia) => setCerradas((actual) => actual.includes(dependencia) ? actual.filter((item) => item !== dependencia) : [...actual, dependencia])} onPagina={(dependencia, pagina) => setPaginas((actual) => ({ ...actual, [dependencia]: pagina }))} onExportar={exportarDependencia} />
    <TarjetasSeguimiento tablero={tablero.datos} />
    <HistorialReciente
      registros={historial.datos.results}
      cargando={historial.cargando}
      pagina={paginaHistorial}
      totalPaginas={totalPaginasHistorial}
      total={historial.datos.count}
      onAnterior={() => setPaginaHistorial((actual) => Math.max(1, actual - 1))}
      onSiguiente={() => setPaginaHistorial((actual) => Math.min(totalPaginasHistorial, actual + 1))}
      onExportar={exportarHistorial}
    />
  </div>;
}
