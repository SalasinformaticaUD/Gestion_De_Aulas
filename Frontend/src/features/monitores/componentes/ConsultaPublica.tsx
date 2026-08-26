"use client";
import Link from "next/link";
import { useState,type FormEvent } from "react";
import { adaptarConsultaPublica } from "@/features/monitores/api/adaptadoresMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import type { Monitor, ResumenMonitor, SesionMonitor } from "@/features/monitores/tipos/modelosMonitores";
import { ResumenHoras } from "./ResumenHoras";
import { TablaSesiones } from "./TablaSesiones";
import estilos from "./SistemaVisualMonitores.module.css";

export function ConsultaPublica(){
  const[codigo,setCodigo]=useState("");
  const[resultado,setResultado]=useState<{monitor:Monitor;resumen:ResumenMonitor;sesiones:SesionMonitor[]}|null>(null);
  const[error,setError]=useState("");
  const[cargando,setCargando]=useState(false);
  const consultar=async(e:FormEvent)=>{e.preventDefault();setCargando(true);setError("");try{setResultado(adaptarConsultaPublica(await servicioMonitores.consultaPublica(codigo.trim())))}catch(problema){setResultado(null);setError(problema instanceof Error?problema.message:"No fue posible realizar la consulta.")}finally{setCargando(false)}};
  return <div className={estilos.portadaPublica}><header className={estilos.marcaPublica}><div><strong>SGOAS · Gestión de Monitores</strong><span>Consulta institucional de horas</span></div><Link className={estilos.botonSecundario} href="/login?app=monitores">Ingresar al módulo</Link></header><main className={estilos.contenidoPublico}><section className={`${estilos.tarjeta} ${estilos.buscadorPublico}`}><header><div><span className={estilos.etiqueta}>Consulta pública</span><h2>Consulte sus horas de monitoría</h2><p>Ingrese el código estudiantil registrado en el sistema.</p></div></header><form className={estilos.formulario} onSubmit={consultar}><label className={estilos.campo}><span>Código estudiantil</span><input value={codigo} onChange={(e)=>{setCodigo(e.target.value);setError("")}} placeholder="Ej. 20211001001" required/></label><button className="button-primary" type="submit" disabled={cargando}>{cargando?"Consultando…":"Consultar"}</button></form>{error&&<div className={`${estilos.aviso} ${estilos.avisoError}`} role="alert">{error}</div>}</section>{resultado&&<section className={estilos.resultadoPublico}><section className={estilos.tarjeta}><div className={estilos.detalleMonitor}><div><h2>{resultado.monitor.nombre}</h2><p>Código {resultado.monitor.codigo} · {resultado.monitor.dependencia}</p></div><span className={`${estilos.insignia} ${estilos.exito}`}>Registro activo</span></div></section><ResumenHoras resumen={resultado.resumen} incluirAlertas/><TablaSesiones sesiones={resultado.sesiones}/></section>}</main></div>
}
