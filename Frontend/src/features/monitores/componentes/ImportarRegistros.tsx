"use client";

import { useState, type FormEvent } from "react";
import { modoDemoMonitores } from "@/features/monitores/api/modoDemo";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import estilos from "./SistemaVisualMonitores.module.css";

export function ImportarRegistros() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ procesados: number; pendientes: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!archivo) return;
    const extension = archivo.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(extension ?? "")) return setError("Seleccione un archivo Excel .xlsx o .xls.");
    if (archivo.size > 10 * 1024 * 1024) return setError("El archivo no puede superar 10 MB.");
    setError(""); setCargando(true);
    try {
      const trabajo = modoDemoMonitores ? { imported_rows: 42, failed_rows: 3, total_rows: 45 } : await servicioMonitores.importarAsistencia(archivo);
      setResultado({ procesados: trabajo.imported_rows, pendientes: trabajo.failed_rows, total: trabajo.total_rows });
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No fue posible importar los registros."); }
    finally { setCargando(false); }
  };
  return <><section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Registros de asistencia</span><h1>Importar registros</h1><p>Cargue un archivo Excel para procesar los registros de marcación del periodo.</p></div></section><div className={estilos.aviso}>Los líderes solo pueden subir registros de su propia dependencia, según la columna <strong>Departamento</strong> del archivo.</div><section className={estilos.tarjeta}><header><div><h2>Carga manual de Excel</h2><p>Seleccione el archivo de Croschex; se validará antes de enviarlo al procesamiento.</p></div></header><form className={estilos.formulario} onSubmit={enviar}><label className={estilos.zonaCarga}><span><strong>{archivo?.name ?? "Seleccione el archivo de marcaciones"}</strong>Formatos admitidos: XLSX y XLS · máximo 10 MB</span><input type="file" accept=".xlsx,.xls" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null); setError(""); }} required /></label>{error && <div className={`${estilos.aviso} ${estilos.avisoError}`}>{error}</div>}<div className={estilos.accionesFormulario}><button className="button-primary" type="submit" disabled={!archivo || cargando}>{cargando ? "Procesando…" : "Subir registros"}</button></div></form>{resultado && <div className={estilos.contenido}><div className={`${estilos.aviso} ${estilos.avisoExito}`}>{modoDemoMonitores ? "Carga simulada completada para validar el flujo." : "Archivo recibido. El backend continuará su procesamiento y notificará el resultado."}</div><div className={estilos.resultadoImportacion}><span><b>{resultado.procesados}</b>Importados</span><span><b>{resultado.pendientes}</b>Con error</span><span><b>{Math.max(0, resultado.total - resultado.procesados - resultado.pendientes)}</b>Pendientes</span><span><b>{resultado.total}</b>Total de filas</span></div></div>}</section></>;
}
