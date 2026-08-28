import estilos from "../SistemaVisualMonitores.module.css";

export function MetricasCuentas({ total, activos, pendientes, inactivos }: { total: number; activos: number; pendientes: number; inactivos: number }) {
  const metricas = [["Total", total, "violeta"], ["Activos", activos, "verde"], ["Pendientes", pendientes, "ambar"], ["Inactivos", inactivos, "azul"]] as const;
  return <section className={estilos.metricas} aria-label="Resumen de monitores">{metricas.map(([etiqueta, valor, tono]) => <article className={`${estilos.metrica} ${estilos[tono]}`} key={etiqueta}><span>{etiqueta}</span><strong>{valor}</strong><small>Estado actual del directorio</small></article>)}</section>;
}
