import type { ConciliacionApi } from "@/features/monitores/api/contratosMonitores";
import { nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import { Paginacion } from "../Paginacion";
import estilos from "../SistemaVisualMonitores.module.css";

type Propiedades = {
  registros: ConciliacionApi[];
  cargando: boolean;
  pagina: number;
  totalPaginas: number;
  total: number;
  onAnterior: () => void;
  onSiguiente: () => void;
  onExportar: () => void;
};

function fechaLarga(valor: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${valor}T12:00:00`));
}

export function HistorialReciente({ registros, cargando, pagina, totalPaginas, total, onAnterior, onSiguiente, onExportar }: Propiedades) {
  return <section className={`${estilos.tarjeta} ${estilos.dashboardHistorial}`}><header><div><h2>Historial reciente de registros</h2><p>{total} registros visibles.</p></div><button type="button" className={estilos.botonSecundario} onClick={onExportar} disabled={!registros.length}>Generar Excel</button></header><div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaHistorial}`}><thead><tr><th>Nombre crudo</th><th>Dependencia</th><th>Fecha</th><th>Estado</th><th>Monitor</th></tr></thead><tbody>{registros.map((registro) => { const conciliado = registro.reconciliation_status === "matched"; return <tr key={registro.id}><td><strong>{registro.raw_full_name}</strong></td><td>{nombreDependencia(registro.raw_department)}</td><td>{fechaLarga(registro.work_day)}</td><td><span className={`${estilos.insignia} ${conciliado ? estilos.exito : estilos.peligro}`}>{conciliado ? "Conciliado" : "Rechazado"}</span></td><td>{registro.monitor_name || "Sin monitor asociado"}</td></tr>; })}{!cargando && !registros.length && <tr className={estilos.filaVacia}><td colSpan={5}><span>Sin registros conciliados o rechazados.</span></td></tr>}</tbody></table></div><Paginacion pagina={pagina} totalPaginas={totalPaginas} total={total} anterior={onAnterior} siguiente={onSiguiente} /></section>;
}
