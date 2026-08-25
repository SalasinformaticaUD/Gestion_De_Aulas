import type { ResumenMonitor } from "@/features/monitores/tipos/modelosMonitores";
import estilos from "./VistasMonitores.module.css";

export function ResumenHoras({ resumen, incluirAlertas = false }: { resumen:ResumenMonitor; incluirAlertas?:boolean }) {
  const total = resumen.horasNormales + resumen.horasExtraAprobadas + resumen.horasAnotaciones;
  const faltantes = Math.max(0, 192 - total);
  const items = [
    ["Horas turno", resumen.horasNormales, "verde"], ["Extra aprobadas", resumen.horasExtraAprobadas, "azul"],
    ["Total de horas", total, "violeta"], ["Extra por aprobar", resumen.horasExtraPendientes, "ambar"],
    ["Anotaciones", resumen.horasAnotaciones, "azul"], ["Faltan para 192 h", faltantes, "ambar"],
  ];
  return <section className={estilos.metricas}>{items.map(([label, value, tone]) => <article key={String(label)} className={`${estilos.metrica} ${estilos[String(tone)]}`}><span>{label}</span><strong>{Number(value).toFixed(1)} h</strong><small>{label === "Total de horas" ? "Cálculo neto acumulado" : "Corte actual"}</small></article>)}{incluirAlertas && <article className={`${estilos.metrica} ${estilos.ambar}`}><span>Retrasos</span><strong>2</strong><small>Sin memorando vigente</small></article>}</section>;
}
