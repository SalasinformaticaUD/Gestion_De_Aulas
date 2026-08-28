import estilos from "../SistemaVisualMonitores.module.css";

export function CabeceraCuentas({ onExportar }: { onExportar: () => void }) {
  return <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Administración de monitores</span><h1>Gestión de monitores</h1><p>Administra cuentas institucionales, vinculación de monitores, activaciones y cargas masivas desde Excel.</p></div><button type="button" className="button-primary" onClick={onExportar}>Generar Excel</button></section>;
}
