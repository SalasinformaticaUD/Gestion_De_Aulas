import Link from "next/link";
import type { Monitor, ResumenMonitor } from "@/features/monitores/tipos/modelosMonitores";
import estilos from "../SistemaVisualMonitores.module.css";

type HorasPorMonitorProps = {
  dependencias: string[];
  monitores: Monitor[];
  resumenes: ResumenMonitor[];
  cerradas: string[];
  paginas: Record<string, number>;
  filasPorPagina: number;
  onAlternar: (dependencia: string) => void;
  onPagina: (dependencia: string, pagina: number) => void;
  onExportar: (dependencia: string) => void;
};

export function HorasPorMonitor({ dependencias, monitores, resumenes, cerradas, paginas, filasPorPagina, onAlternar, onPagina, onExportar }: HorasPorMonitorProps) {
  return (
    <section className={`${estilos.tarjeta} ${estilos.dashboardTabla}`}>
      <header><div><h2>Horas por monitor</h2><p>Monitores visibles organizados por dependencia, con paginación independiente.</p></div></header>
      <div className={estilos.tablaContenedor}>
        <table className={`${estilos.tabla} ${estilos.tablaDashboard}`}>
          <thead><tr><th>Monitor</th><th>Normales (h)</th><th>Extra aprobadas (h)</th><th>Extra por aprobar (h)</th><th>Anotaciones (h)</th><th>Total (h)</th><th>Faltan para 192 h</th><th>Acciones</th></tr></thead>
          <tbody>
            {dependencias.map((dependencia) => {
              const grupo = monitores.filter((monitor) => monitor.dependencia === dependencia);
              const totalPaginas = Math.max(1, Math.ceil(grupo.length / filasPorPagina));
              const pagina = Math.min(paginas[dependencia] ?? 1, totalPaginas);
              const visibles = grupo.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina);
              return <GrupoDependencia key={dependencia} dependencia={dependencia} cerrada={cerradas.includes(dependencia)} pagina={pagina} totalPaginas={totalPaginas} total={grupo.length} filas={visibles} resumenes={resumenes} onAlternar={() => onAlternar(dependencia)} onPagina={(nuevaPagina) => onPagina(dependencia, nuevaPagina)} onExportar={() => onExportar(dependencia)} />;
            })}
            {!monitores.length && <tr className={estilos.filaVacia}><td colSpan={8}><span>Sin datos de monitores para mostrar.</span></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type GrupoDependenciaProps = { dependencia: string; cerrada: boolean; pagina: number; totalPaginas: number; total: number; filas: Monitor[]; resumenes: ResumenMonitor[]; onAlternar: () => void; onPagina: (pagina: number) => void; onExportar: () => void };

function GrupoDependencia({ dependencia, cerrada, pagina, totalPaginas, total, filas, resumenes, onAlternar, onPagina, onExportar }: GrupoDependenciaProps) {
  return <>
    <tr className={estilos.separadorDependencia}><td colSpan={8}><button type="button" onClick={onAlternar} aria-expanded={!cerrada}><span aria-hidden="true">{cerrada ? "▸" : "▾"}</span>{dependencia}</button></td></tr>
    {!cerrada && <>
      {filas.map((monitor) => {
        const resumen = resumenes.find((item) => item.monitorId === monitor.id);
        const totalHoras = (resumen?.horasNormales ?? 0) + (resumen?.horasExtraAprobadas ?? 0) + (resumen?.horasAnotaciones ?? 0);
        return <tr key={monitor.id}><td><strong>{monitor.nombre}</strong></td><td>{(resumen?.horasNormales ?? 0).toFixed(1)}</td><td>{(resumen?.horasExtraAprobadas ?? 0).toFixed(1)}</td><td>{(resumen?.horasExtraPendientes ?? 0).toFixed(1)}</td><td>{(resumen?.horasAnotaciones ?? 0).toFixed(1)}</td><td><strong>{totalHoras.toFixed(1)}</strong></td><td>{Math.max(0, 192 - totalHoras).toFixed(1)}</td><td><Link className={estilos.accionTablaFija} href={`/gestion-monitores/registros/${monitor.id}`}>Ver registros</Link></td></tr>;
      })}
      <tr className={estilos.filaAccionesGrupo}><td colSpan={8}><button type="button" className={estilos.botonSecundario} onClick={onExportar}>Generar Excel de {dependencia}</button></td></tr>
      <tr><td colSpan={8}><div className={estilos.paginacionLocal}><span>Página {pagina} de {totalPaginas} · {total} registros en esta dependencia</span><div><button type="button" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>Anterior</button><button type="button" disabled={pagina >= totalPaginas} onClick={() => onPagina(pagina + 1)}>Siguiente</button></div></div></td></tr>
    </>}
  </>;
}
