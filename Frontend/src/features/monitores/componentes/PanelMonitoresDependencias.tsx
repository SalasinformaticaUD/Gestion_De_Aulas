"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

function descargar(nombre: string, filas: string[][]) {
  const contenido = filas.map((fila) => fila.map((valor) => `"${valor.replaceAll('"', '""')}"`).join(";")).join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8;" }));
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function PanelMonitoresDependencias() {
  const router = useRouter();
  const tablero = usarRecursoApi(servicioMonitores.obtenerDashboard, { monitor_rows: [], pending_overtime: [], recent_annotations: [], notifications: [] } as DashboardApi);
  const recursoMonitores = usarRecursoApi(servicioMonitores.listarMonitores, [] as MonitorApi[]);
  const conciliaciones = usarRecursoApi(servicioMonitores.listarConciliaciones, [] as ConciliacionApi[]);
  const [codigo, setCodigo] = useState("");
  const [consultaError, setConsultaError] = useState("");
  const [cerradas, setCerradas] = useState<string[]>([]);
  const [paginas, setPaginas] = useState<Record<string, number>>({});

  const monitores = useMemo(() => recursoMonitores.datos.map(adaptarMonitor), [recursoMonitores.datos]);
  const resumenes = useMemo(() => adaptarResumenDashboard(tablero.datos.monitor_rows), [tablero.datos.monitor_rows]);
  const dependencias = useMemo(() => [...new Set(monitores.map((item) => item.dependencia))], [monitores]);
  const error = tablero.error || recursoMonitores.error || conciliaciones.error;

  const consultar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setConsultaError("");
    try {
      const respuesta = await servicioMonitores.consultaPublica(codigo.trim());
      const monitor = monitores.find((item) => item.codigo === respuesta.monitor.codigo_estudiante);
      if (!monitor) {
        setConsultaError("El monitor no está disponible en el directorio actual.");
        return;
      }
      router.push(`/gestion-monitores/registros/${monitor.id}`);
    } catch (problema) {
      setConsultaError(problema instanceof Error ? problema.message : "No se encontró el monitor.");
    }
  };

  const exportarDependencia = (dependencia: string) => {
    const filas = monitores.filter((monitor) => monitor.dependencia === dependencia);
    descargar(`horas_${dependencia.toLowerCase().replaceAll(" ", "_")}`, [["Monitor", "Normales (h)", "Horas extra aprobadas (h)", "Horas extra por aprobar (h)", "Anotaciones (h)", "Total (h)", "Faltan para 192 h"], ...filas.map((monitor) => {
      const resumen = resumenes.find((item) => item.monitorId === monitor.id);
      const total = (resumen?.horasNormales ?? 0) + (resumen?.horasExtraAprobadas ?? 0) + (resumen?.horasAnotaciones ?? 0);
      return [monitor.nombre, (resumen?.horasNormales ?? 0).toFixed(1), (resumen?.horasExtraAprobadas ?? 0).toFixed(1), (resumen?.horasExtraPendientes ?? 0).toFixed(1), (resumen?.horasAnotaciones ?? 0).toFixed(1), total.toFixed(1), Math.max(0, 192 - total).toFixed(1)];
    })]);
  };

  const exportarHistorial = () => descargar("historial_reciente_registros", [["Nombre crudo", "Dependencia", "Fecha", "Estado", "Monitor"], ...conciliaciones.datos.map((item) => [item.raw_full_name, nombreDependencia(item.raw_department), item.work_day, item.reconciliation_status, item.monitor_name || "-"])]);

  return <div className={estilos.dashboardMonitores}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión de monitores</span><h1>Panel de monitores</h1><p>Consulta y seguimiento de registros de los monitores de su dependencia.</p></div></section>
    <ConsultaCodigo codigo={codigo} error={consultaError} onCodigoChange={setCodigo} onSubmit={consultar} />
    {error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}
    <HorasPorMonitor dependencias={dependencias} monitores={monitores} resumenes={resumenes} cerradas={cerradas} paginas={paginas} filasPorPagina={filasPorPagina} onAlternar={(dependencia) => setCerradas((actual) => actual.includes(dependencia) ? actual.filter((item) => item !== dependencia) : [...actual, dependencia])} onPagina={(dependencia, pagina) => setPaginas((actual) => ({ ...actual, [dependencia]: pagina }))} onExportar={exportarDependencia} />
    <TarjetasSeguimiento tablero={tablero.datos} />
    <HistorialReciente registros={conciliaciones.datos} onExportar={exportarHistorial} />
  </div>;
}
