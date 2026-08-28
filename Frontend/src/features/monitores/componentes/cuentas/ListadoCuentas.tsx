import type { CuentaMonitor, EstadoCuentaMonitor } from "./tipos";
import estilos from "../SistemaVisualMonitores.module.css";

type ListadoCuentasProps = {
  monitores: CuentaMonitor[];
  texto: string;
  estado: string;
  alertas: string;
  orden: string;
  onTexto: (valor: string) => void;
  onEstado: (valor: string) => void;
  onAlertas: (valor: string) => void;
  onOrden: (valor: string) => void;
  onBuscar: () => void;
  onExportar: () => void;
  onEditar: (monitor: CuentaMonitor) => void;
  onAlternarEstado: (monitor: CuentaMonitor) => void;
  onReenviar: (monitor: CuentaMonitor) => void;
  onEliminar: (monitor: CuentaMonitor) => void;
};

export function ListadoCuentas({ monitores, texto, estado, alertas, orden, onTexto, onEstado, onAlertas, onOrden, onBuscar, onExportar, onEditar, onAlternarEstado, onReenviar, onEliminar }: ListadoCuentasProps) {
  return <section className={`${estilos.tarjeta} ${estilos.listadoCuentas}`}><header><div><h2>Monitores registrados</h2><p>Consulte cuentas, alertas y el estado de vinculación de cada monitor.</p></div><button type="button" className={estilos.botonSecundario} onClick={onExportar}>Generar Excel</button></header><div className={estilos.barraHerramientas}><Campo etiqueta="Buscar" ancho><input value={texto} onChange={(e) => onTexto(e.target.value)} placeholder="Nombre, código, correo o documento" /></Campo><Campo etiqueta="Estado"><select value={estado} onChange={(e) => onEstado(e.target.value)}><option value="TODOS">Todos</option><option>ACTIVO</option><option>PENDIENTE</option><option>INACTIVO</option></select></Campo><Campo etiqueta="Alertas"><select value={alertas} onChange={(e) => onAlertas(e.target.value)}><option value="TODAS">Todas</option><option value="CON_ALERTAS">Con alertas</option><option value="SIN_ALERTAS">Sin alertas</option></select></Campo><Campo etiqueta="Orden"><select value={orden} onChange={(e) => onOrden(e.target.value)}><option value="NOMBRE">Nombre</option><option value="CODIGO">Código</option><option value="RECIENTE">Más reciente</option></select></Campo><button type="button" className="button-primary" onClick={onBuscar}>Buscar</button></div><div className={estilos.tablaContenedor}><table className={`${estilos.tabla} ${estilos.tablaCuentas}`}><thead><tr><th>Nombre</th><th>Código</th><th>Correo</th><th>Dependencia</th><th>Alertas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{monitores.map((monitor) => <tr key={monitor.id}><td><strong>{monitor.nombre}</strong><small>{monitor.documento}</small></td><td>{monitor.codigo}</td><td className={estilos.correoCuenta}>{monitor.correo}</td><td>{monitor.dependencia}</td><td>{monitor.alertas ? <span className={`${estilos.insignia} ${estilos.advertencia}`}>{monitor.alertas} alerta{monitor.alertas > 1 ? "s" : ""}</span> : <span className={`${estilos.insignia} ${estilos.neutro}`}>Sin alertas</span>}</td><td><Estado estado={monitor.estado} /></td><td><div className={estilos.accionesCuenta}><button type="button" onClick={() => onEditar(monitor)}>Editar</button><button type="button" onClick={() => onAlternarEstado(monitor)}>{monitor.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button><button type="button" onClick={() => onReenviar(monitor)}>Reenviar</button><button type="button" className={estilos.eliminar} onClick={() => onEliminar(monitor)}>Eliminar</button></div></td></tr>)}{!monitores.length && <tr className={estilos.filaVacia}><td colSpan={7}><span>No hay monitores que coincidan con la búsqueda.</span></td></tr>}</tbody></table></div></section>;
}

function Campo({ etiqueta, ancho, children }: { etiqueta: string; ancho?: boolean; children: React.ReactNode }) { return <label className={ancho ? estilos.campoAncho : estilos.campo}><span>{etiqueta}</span>{children}</label>; }
function Estado({ estado }: { estado: EstadoCuentaMonitor }) { const clase = estado === "ACTIVO" ? estilos.exito : estado === "PENDIENTE" ? estilos.advertencia : estilos.neutro; return <span className={`${estilos.insignia} ${clase}`}>{estado[0] + estado.slice(1).toLowerCase()}</span>; }
