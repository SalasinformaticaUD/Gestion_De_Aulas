import Link from "next/link";
import { monitores, resumenesIniciales, sesionesIniciales } from "@/features/monitores/datos/datosMonitores";
import { ResumenHoras } from "./ResumenHoras";
import { TablaSesiones } from "./TablaSesiones";
import estilos from "./VistasMonitores.module.css";

export function RegistrosMonitor({ monitorId }:{ monitorId:string }) {
  const monitor = monitores.find((item) => item.id === monitorId) ?? monitores[0];
  const resumen = resumenesIniciales.find((item) => item.monitorId === monitor.id)!;
  return <><section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Detalle individual</span><h1>Registros del monitor</h1><p>Entradas, salidas y cálculo acumulado de horas.</p></div><Link className={estilos.botonSecundario} href="/gestion-monitores">Volver al dashboard</Link></section><section className={estilos.tarjeta}><div className={estilos.detalleMonitor}><div><h2>{monitor.nombre}</h2><p>Código {monitor.codigo} · {monitor.dependencia}</p></div><span className={`${estilos.insignia} ${estilos.exito}`}>Monitor activo</span></div></section><div style={{height:"1rem"}}/><ResumenHoras resumen={resumen}/><TablaSesiones sesiones={sesionesIniciales.filter((item) => item.monitorId === monitor.id)}/></>;
}
